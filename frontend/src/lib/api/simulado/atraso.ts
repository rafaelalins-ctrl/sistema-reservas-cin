/** Latência artificial (300–800 ms) para exercitar os estados de carregando. Zero nos testes. */
export async function atraso() {
  if (import.meta.env.MODE === 'test') return
  await new Promise((resolver) => setTimeout(resolver, 300 + Math.random() * 500))
}
