# Frontend - Reservas CIn

Frontend estático, sem dependências, para consultar os espaços e a disponibilidade
da API Crow. A URL padrão é `http://localhost:18080/api` e pode ser alterada na
própria tela.

## Executar

Com o backend em execução, a partir desta pasta:

```bash
python -m http.server 5173
```

Abra `http://localhost:5173`. O navegador pode bloquear chamadas entre portas
por CORS em versões antigas do backend; a versão atual já envia os cabeçalhos
necessários nas rotas de consulta. A tela trata os endpoints de reservas que
ainda retornam `501` como funcionalidade em desenvolvimento.
