const apiBase = localStorage.getItem('reservas-api') || 'http://localhost:18080/api';
const $ = (selector) => document.querySelector(selector);
$('#api-base').value = apiBase;

function endpoint(path) { return `${$('#api-base').value.trim().replace(/\/$/, '')}${path}`; }
function showNotice(message) { const notice = $('#notice'); notice.textContent = message; notice.hidden = !message; }
function setStatus(message, state) { $('#api-status-text').textContent = message; $('#api-status').dataset.state = state; }
async function request(path, payload) {
  // text/plain evita o preflight automatico do Crow para este formulario JSON.
  const response = await fetch(endpoint(path), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await response.text() || `A API respondeu com status ${response.status}.`);
  return response.json();
}

async function authenticate(event) {
  event.preventDefault();
  localStorage.setItem('reservas-api', $('#api-base').value.trim().replace(/\/$/, ''));
  try {
    const user = await request('/auth/login', { email: $('#login-email').value, senha: $('#login-password').value });
    localStorage.setItem('reservas-user', JSON.stringify(user));
    setStatus('API conectada', 'online');
    window.location.href = 'dashboard.html';
  } catch (error) { setStatus('Falha no login', 'error'); showNotice(error.message); }
}

async function createAccount(event) {
  event.preventDefault();
  localStorage.setItem('reservas-api', $('#api-base').value.trim().replace(/\/$/, ''));
  try {
    const user = await request('/auth/cadastro', { nome: $('#signup-name').value, email: $('#signup-email').value, senha: $('#signup-password').value, tipo: $('#signup-type').value, departamento: $('#signup-department').value });
    localStorage.setItem('reservas-user', JSON.stringify(user));
    window.location.href = 'dashboard.html';
  } catch (error) { setStatus('Falha no cadastro', 'error'); showNotice(error.message); }
}

document.querySelectorAll('[data-auth-view]').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-auth-view]').forEach((item) => item.classList.toggle('active', item === tab));
  $('#login-form').hidden = tab.dataset.authView !== 'login-view';
  $('#signup-form').hidden = tab.dataset.authView !== 'signup-view';
}));
$('#login-form').addEventListener('submit', authenticate);
$('#signup-form').addEventListener('submit', createAccount);
if (localStorage.getItem('reservas-user')) window.location.href = 'dashboard.html';
