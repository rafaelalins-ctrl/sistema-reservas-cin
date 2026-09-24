const state = { spaces: [], apiBase: localStorage.getItem('reservas-api') || 'http://localhost:18080/api', user: JSON.parse(localStorage.getItem('reservas-user') || 'null') };
const $ = (selector) => document.querySelector(selector);
if (!state.user) {
  window.location.replace('index.html');
} else {
  $('#dashboard-name').textContent = state.user.nome;
  document.querySelectorAll('.admin-only').forEach((element) => { element.hidden = state.user.tipo !== 'ADMINISTRADOR'; });
}

function endpoint(path) { return `${state.apiBase.replace(/\/$/, '')}${path}`; }
function showNotice(message) { const notice = $('#notice'); notice.textContent = message; notice.hidden = !message; }
function setStatus(message, stateName) { $('#api-status-text').textContent = message; $('#api-status').dataset.state = stateName; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function formatType(type = '') { return type.replaceAll('_', ' ').toLowerCase().replace(/(^| )\S/g, (letter) => letter.toUpperCase()); }
function minutes(time) { const [hours, value] = time.split(':').map(Number); return hours * 60 + value; }
function formatMinutes(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
async function fetchJson(url, options) { const response = await fetch(url, options); if (!response.ok) throw new Error(await response.text() || `A API respondeu com status ${response.status}.`); return response.json(); }
async function submitJson(path, payload) { return fetchJson(endpoint(path), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }); }

function populateSpaceSelects() {
  const options = state.spaces.map((space) => `<option value="${space.id}">${escapeHtml(space.codigo || space.identificacao)} - ${escapeHtml(space.identificacao)}</option>`).join('');
  $('#reservation-space').innerHTML = '<option value="">Selecione um espaço</option>' + options;
  $('#occupancy-space').innerHTML = '<option value="">Selecione um espaço</option>' + options;
}
function renderSpaces(spaces = state.spaces) {
  const query = $('#search').value.trim().toLowerCase();
  const filtered = spaces.filter((space) => `${space.identificacao} ${space.tipo} ${space.detalhes || ''}`.toLowerCase().includes(query));
  $('#space-count').textContent = filtered.length;
  $('#space-grid').innerHTML = filtered.length ? filtered.map((space) => `<article class="space-card"><div class="space-type">${escapeHtml(space.codigo || '')} - ${formatType(space.tipo)}</div><h3>${escapeHtml(space.identificacao)}</h3><p class="space-details">${escapeHtml(space.detalhes || '')}</p><div class="space-meta"><span>${space.capacidade || 0} lugares</span><span>${escapeHtml(space.andar || '')}</span></div><button class="card-action" data-space-id="${space.id}" type="button">Ver agenda</button></article>`).join('') : '<div class="empty-state">Nenhum espaço encontrado.</div>';
  document.querySelectorAll('[data-space-id]').forEach((button) => button.addEventListener('click', () => { $('#occupancy-space').value = button.dataset.spaceId; document.querySelector('[data-view="search-view"]').click(); loadOccupancy(); }));
  populateSpaceSelects();
}
async function loadSpaces() { try { state.spaces = await fetchJson(endpoint('/espacos')); renderSpaces(); setStatus('API conectada', 'online'); } catch (error) { setStatus('API indisponível', 'error'); showNotice(error.message); } }
async function loadMyReservations() { try { const reservations = await fetchJson(endpoint(`/usuarios/${state.user.id}/reservas`)); $('#reservation-count').textContent = reservations.length; $('#my-reservations-list').innerHTML = reservations.length ? reservations.map((item) => `<article class="reservation-item"><div><strong>${escapeHtml(item.codigo)} - ${escapeHtml(item.espaco)}</strong><span>${item.data} · ${escapeHtml(item.dia)} · ${formatMinutes(item.inicio)} às ${formatMinutes(item.fim)}</span></div><em class="status-${item.status.toLowerCase()}">${item.status}</em></article>`).join('') : '<span class="empty-state">Você ainda não possui reservas.</span>'; } catch (error) { showNotice(error.message); } }
async function loadPendingReservations() { if (state.user.tipo !== 'ADMINISTRADOR') return; try { const reservations = await fetchJson(endpoint(`/admin/reservas/pendentes?idAdmin=${state.user.id}`)); $('#pending-count').textContent = reservations.length; $('#pending-list').innerHTML = reservations.length ? reservations.map((item) => `<article class="reservation-item"><div><strong>#${item.id} - ${escapeHtml(item.codigo)} - ${escapeHtml(item.espaco)}</strong><span>${escapeHtml(item.professor)} - ${item.data} - ${escapeHtml(item.dia)} - ${formatMinutes(item.inicio)} às ${formatMinutes(item.fim)}</span></div><div class="approval-actions"><button class="button button-accent" data-approve="${item.id}" type="button">Aprovar</button><button class="button button-light" data-reject="${item.id}" type="button">Rejeitar</button></div></article>`).join('') : '<span class="empty-state">Nenhuma solicitação pendente.</span>'; document.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', () => updateReservation(button.dataset.approve, 'aprovar'))); document.querySelectorAll('[data-reject]').forEach((button) => button.addEventListener('click', () => updateReservation(button.dataset.reject, 'rejeitar'))); } catch (error) { showNotice(error.message); } }
async function updateReservation(id, action) { try { const result = await submitJson(`/reservas/${id}/${action}`, { idAdmin: state.user.id }); showNotice(result.mensagem); await loadPendingReservations(); } catch (error) { showNotice(error.message); } }
async function searchAvailability(event) { event.preventDefault(); const start = $('#start-time').value; const end = $('#end-time').value; if (minutes(start) >= minutes(end)) { showNotice('O horário final deve ser maior que o inicial.'); return; } const params = new URLSearchParams({ data: $('#availability-date').value, dia: $('#day').value, inicio: minutes(start), fim: minutes(end), capacidade: $('#capacity').value || 0 }); try { state.spaces = await fetchJson(endpoint(`/espacos/disponiveis?${params}`)); renderSpaces(); } catch (error) { showNotice(error.message); } }
async function createReservation(event) { event.preventDefault(); if (state.user.tipo !== 'PROFESSOR') { showNotice('Apenas professores podem solicitar reservas.'); return; } const start = $('#reservation-start').value; const end = $('#reservation-end').value; if (minutes(start) >= minutes(end)) { showNotice('O horário final deve ser maior que o inicial.'); return; } try { const result = await submitJson('/reservas', { idUsuario: state.user.id, idEspaco: Number($('#reservation-space').value), data: $('#reservation-date').value, dia: $('#reservation-day').value, inicio: minutes(start), fim: minutes(end) }); showNotice(`${result.mensagem} Código ${result.id}.`); await loadMyReservations(); } catch (error) { showNotice(error.message); } }
async function loadOccupancy() { const id = $('#occupancy-space').value; if (!id) return; try { const bookings = await fetchJson(endpoint(`/espacos/${id}/ocupacoes`)); $('#occupancy-results').innerHTML = bookings.length ? bookings.map((item) => `<div class="occupancy-item"><strong>${item.inicio}</strong><span>até ${item.fim}</span><em>${item.status}</em></div>`).join('') : '<span class="empty-state">Nenhuma reserva encontrada.</span>'; } catch (error) { showNotice(error.message); } }

document.querySelectorAll('.nav-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.nav-tab').forEach((item) => item.classList.toggle('active', item === tab)); document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.id !== tab.dataset.view; }); if (tab.dataset.view === 'admin-view') loadPendingReservations(); }));
$('#logout').addEventListener('click', () => { localStorage.removeItem('reservas-user'); window.location.replace('index.html'); });
$('#availability-form').addEventListener('submit', searchAvailability);
$('#reservation-form').addEventListener('submit', createReservation);
$('#search').addEventListener('input', () => renderSpaces());
$('#load-occupancy').addEventListener('click', loadOccupancy);
loadSpaces();
loadMyReservations();
loadPendingReservations();
