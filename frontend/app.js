const state = { spaces: [], apiBase: localStorage.getItem('reservas-api') || 'http://localhost:18080/api', user: JSON.parse(localStorage.getItem('reservas-user') || 'null') };
const $ = (selector) => document.querySelector(selector);

function setStatus(message, status = 'idle') {
  $('#api-status').dataset.state = status;
  $('#api-status-text').textContent = message;
}

function showNotice(message) {
  const notice = $('#notice');
  notice.textContent = message;
  notice.hidden = !message;
}

function endpoint(path) {
  return `${state.apiBase.replace(/\/$/, '')}${path}`;
}

function renderSpaces(spaces = state.spaces) {
  const query = $('#search').value.trim().toLowerCase();
  const filtered = spaces.filter((space) => `${space.identificacao} ${space.tipo} ${space.descricao || ''}`.toLowerCase().includes(query));
  $('#space-count').textContent = filtered.length;
  $('#space-grid').innerHTML = filtered.length ? filtered.map((space) => `
    <article class="space-card">
      <div class="space-type">${escapeHtml(space.codigo || '')} - ${formatType(space.tipo)}</div>
      <h3>${escapeHtml(space.identificacao || 'Espaço sem nome')}</h3>
      <p class="space-details">${escapeHtml(space.detalhes || '')}</p>
      <div class="space-meta"><span>◉ ${space.capacidade || 0} lugares</span><span>${escapeHtml(space.andar || '')}</span>${space.emManutencao ? '<span class="maintenance">Em manutenção</span>' : '<span>Disponível</span>'}</div>
      <button class="card-action" data-space-id="${space.id}" type="button">Ver agenda</button>
    </article>`).join('') : '<div class="empty-state">Nenhum espaço corresponde à busca.</div>';
  document.querySelectorAll('[data-space-id]').forEach((button) => button.addEventListener('click', () => {
    $('#occupancy-space').value = button.dataset.spaceId;
    loadOccupancy();
    $('#occupancy-title').scrollIntoView({ behavior: 'smooth' });
  }));
  populateSpaceSelects();
}

function populateSpaceSelects() {
  const options = state.spaces.map((space) => `<option value="${space.id}">${escapeHtml(space.codigo || space.identificacao)} - ${escapeHtml(space.identificacao)}</option>`).join('');
  $('#reservation-space').innerHTML = '<option value="">Selecione um espaço</option>' + options;
  $('#occupancy-space').innerHTML = '<option value="">Selecione um espaço</option>' + options;
}

function updateSession() {
  const logged = Boolean(state.user);
  $('#auth-screen').hidden = logged;
  $('#dashboard').hidden = !logged;
  if (logged) $('#dashboard-name').textContent = state.user.nome;
}

function formatType(type = '') { return type.replaceAll('_', ' ').toLowerCase().replace(/(^| )\S/g, (letter) => letter.toUpperCase()); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`);
  return response.json();
}

async function loadSpaces() {
  setStatus('Conectando...', 'idle');
  showNotice('');
  try {
    state.spaces = await fetchJson(endpoint('/espacos'));
    renderSpaces();
    setStatus('API conectada', 'online');
  } catch (error) {
    state.spaces = [];
    renderSpaces();
    setStatus('API indisponível', 'error');
    showNotice(`${error.message} Verifique se o Crow está rodando em ${state.apiBase}.`);
  }
}

function minutes(time) { const [hours, minutesValue] = time.split(':').map(Number); return hours * 60 + minutesValue; }

async function searchAvailability(event) {
  event.preventDefault();
  const start = $('#start-time').value;
  const end = $('#end-time').value;
  if (minutes(start) >= minutes(end)) { showNotice('O horário de fim deve ser depois do horário de início.'); return; }
  const params = new URLSearchParams({ data: $('#availability-date').value, dia: $('#day').value, inicio: minutes(start), fim: minutes(end), capacidade: $('#capacity').value || 0 });
  try {
    showNotice('');
    setStatus('Consultando...', 'idle');
    state.spaces = await fetchJson(endpoint(`/espacos/disponiveis?${params}`));
    renderSpaces();
    setStatus('API conectada', 'online');
  } catch (error) {
    setStatus('API indisponível', 'error');
    showNotice(`${error.message} Não foi possível consultar a disponibilidade.`);
  }
}

async function submitJson(path, payload) {
  return fetchJson(endpoint(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

async function login(event) {
  event.preventDefault();
  try {
    state.user = await submitJson('/auth/login', { email: $('#login-email').value, senha: $('#login-password').value });
    localStorage.setItem('reservas-user', JSON.stringify(state.user)); updateSession(); await loadMyReservations(); showNotice(`Bem-vindo, ${state.user.nome}.`);
  } catch (error) { showNotice(error.message); }
}

async function signup(event) {
  event.preventDefault();
  try {
    state.user = await submitJson('/auth/cadastro', { nome: $('#signup-name').value, email: $('#signup-email').value, senha: $('#signup-password').value, tipo: $('#signup-type').value, departamento: $('#signup-department').value });
    localStorage.setItem('reservas-user', JSON.stringify(state.user)); updateSession(); await loadMyReservations(); showNotice('Conta criada e sessão iniciada.');
  } catch (error) { showNotice(error.message); }
}

async function createReservation(event) {
  event.preventDefault();
  if (!state.user) { showNotice('Faça login como professor para solicitar uma reserva.'); return; }
  const start = $('#reservation-start').value; const end = $('#reservation-end').value;
  if (state.user.tipo !== 'PROFESSOR') { showNotice('Apenas professores podem solicitar reservas.'); return; }
  if (minutes(start) >= minutes(end)) { showNotice('O horário final deve ser maior que o inicial.'); return; }
  try {
    const result = await submitJson('/reservas', { idUsuario: state.user.id, idEspaco: Number($('#reservation-space').value), data: $('#reservation-date').value, dia: $('#reservation-day').value, inicio: minutes(start), fim: minutes(end) });
    showNotice(`${result.mensagem} Código ${result.id}.`); await loadMyReservations(); await loadOccupancy();
  } catch (error) { showNotice(error.message); }
}

async function loadOccupancy() {
  const id = $('#occupancy-space').value;
  if (!id) return;
  try {
    const bookings = await fetchJson(endpoint(`/espacos/${id}/ocupacoes`));
    $('#occupancy-results').innerHTML = bookings.length ? bookings.map((booking) => `<div class="occupancy-item"><strong>${booking.inicio}</strong><span>até ${booking.fim}</span><em>${booking.status}</em></div>`).join('') : '<span class="empty-state">Nenhuma reserva pendente ou aprovada para este espaço.</span>';
  } catch (error) { showNotice(error.message); }
}

async function loadMyReservations() {
  if (!state.user) return;
  try {
    const reservations = await fetchJson(endpoint(`/usuarios/${state.user.id}/reservas`));
    $('#reservation-count').textContent = reservations.length;
    $('#my-reservations-list').innerHTML = reservations.length ? reservations.map((reservation) => `<article class="reservation-item"><div><strong>${escapeHtml(reservation.codigo)} - ${escapeHtml(reservation.espaco)}</strong><span>${reservation.data} · ${escapeHtml(reservation.dia)} · ${formatMinutes(reservation.inicio)} às ${formatMinutes(reservation.fim)}</span></div><em class="status-${reservation.status.toLowerCase()}">${reservation.status}</em></article>`).join('') : '<span class="empty-state">Você ainda não possui reservas.</span>';
  } catch (error) { showNotice(error.message); }
}

function formatMinutes(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }

$('#api-base').value = state.apiBase;
$('#save-api').addEventListener('click', () => { state.apiBase = $('#api-base').value.trim().replace(/\/$/, ''); localStorage.setItem('reservas-api', state.apiBase); loadSpaces(); });
$('#refresh-spaces').addEventListener('click', loadSpaces);
$('#search').addEventListener('input', () => renderSpaces());
$('#availability-form').addEventListener('submit', searchAvailability);
$('#login-form').addEventListener('submit', login);
$('#signup-form').addEventListener('submit', signup);
$('#reservation-form').addEventListener('submit', createReservation);
$('#load-occupancy').addEventListener('click', loadOccupancy);
$('#logout').addEventListener('click', () => { state.user = null; localStorage.removeItem('reservas-user'); updateSession(); showNotice('Sessão encerrada.'); });
document.querySelectorAll('.nav-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach((item) => item.classList.toggle('active', item === tab));
  document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.id !== tab.dataset.view; });
}));
updateSession();
loadSpaces();
if (state.user) loadMyReservations();