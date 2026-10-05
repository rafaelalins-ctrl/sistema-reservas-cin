import { FloppyDiskIcon, SpinnerIcon, TrashIcon } from '@phosphor-icons/react'
import { useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Confirmacao } from '@/components/Confirmacao'
import { Alerta } from '@/components/estados/Estados'
import { Campo, Sobrelinha } from '@/components/formulario/Campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, mensagemAmigavel, TIPOS_USUARIO } from '@/lib/api'
import { useAuth, useUsuario } from '@/lib/auth-context'

type CampoConta = 'nome' | 'departamento' | 'senha' | 'confirmacao'
type Erros = Partial<Record<CampoConta, string>>

// Mesmas regras do cadastro; a senha é opcional (vazia mantém a atual).
function validar(dados: Record<CampoConta, string>, ehProfessor: boolean): Erros {
  const erros: Erros = {}
  if (!dados.nome.trim()) erros.nome = 'Informe seu nome.'
  if (ehProfessor && !dados.departamento.trim()) erros.departamento = 'Informe seu departamento.'
  if (dados.senha && (dados.senha.length < 8 || dados.senha.length > 1024))
    erros.senha = 'A senha deve ter de 8 a 1024 caracteres.'
  if (dados.confirmacao !== dados.senha) erros.confirmacao = 'As senhas não conferem.'
  return erros
}

export function MinhaConta() {
  const usuario = useUsuario()
  const { atualizarConta, excluirConta } = useAuth()
  const ehProfessor = usuario.tipo === 'PROFESSOR'
  const formulario = useRef<HTMLFormElement>(null)

  const [dados, setDados] = useState<Record<CampoConta, string>>({
    nome: usuario.nome,
    departamento: usuario.departamento ?? '',
    senha: '',
    confirmacao: '',
  })
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [excluindo, setExcluindo] = useState(false)
  const [processandoExclusao, setProcessandoExclusao] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')

  function focar(campo: CampoConta) {
    formulario.current?.querySelector<HTMLInputElement>(`#conta-${campo}`)?.focus()
  }

  function alterar(campo: CampoConta, valor: string) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }))
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroGeral('')
    const novos = validar(dados, ehProfessor)
    setErros(novos)
    const primeiro = Object.keys(novos)[0] as CampoConta | undefined
    if (primeiro) return focar(primeiro)

    setSalvando(true)
    try {
      await atualizarConta({
        nome: dados.nome,
        departamento: ehProfessor ? dados.departamento : undefined,
        senha: dados.senha || undefined,
      })
      setDados((atuais) => ({ ...atuais, senha: '', confirmacao: '' }))
      toast.success(dados.senha ? 'Conta e senha atualizadas.' : 'Conta atualizada.')
    } catch (e) {
      const mensagem = mensagemAmigavel(e)
      const campo = e instanceof ApiError ? (e.campo as CampoConta | undefined) : undefined
      if (campo && campo in dados) {
        setErros({ [campo]: mensagem })
        focar(campo)
      } else setErroGeral(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    setErroExclusao('')
    setProcessandoExclusao(true)
    try {
      // Ao encerrar a sessão, o RequireAuth leva para o login.
      await excluirConta()
      toast.success('Conta excluída.')
    } catch (e) {
      setErroExclusao(mensagemAmigavel(e))
      setProcessandoExclusao(false)
    }
  }

  const campo = (
    id: CampoConta,
    rotulo: string,
    props: ComponentProps<typeof Input>,
    dica?: string,
  ) => (
    <Campo id={`conta-${id}`} rotulo={rotulo} erro={erros[id]} dica={dica}>
      {(acessiveis) => (
        <Input
          {...acessiveis}
          {...props}
          value={dados[id]}
          onChange={(event) => alterar(id, event.target.value)}
          className="h-10"
        />
      )}
    </Campo>
  )

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <Sobrelinha>Minha conta</Sobrelinha>
        <h1 className="text-2xl">Dados da conta</h1>
        <p className="text-sm text-muted-foreground">
          {usuario.email} · {TIPOS_USUARIO[usuario.tipo]}. O e-mail é o seu login e não pode ser
          alterado.
        </p>
      </header>

      <form
        ref={formulario}
        onSubmit={salvar}
        noValidate
        className="flex flex-col gap-5 rounded-md border border-border bg-background p-5"
      >
        {campo('nome', 'Nome completo', { autoComplete: 'name', maxLength: 120 })}
        {ehProfessor && campo('departamento', 'Departamento', { maxLength: 120 })}
        {campo(
          'senha',
          'Nova senha',
          { type: 'password', autoComplete: 'new-password', maxLength: 1024 },
          'Deixe em branco para manter a senha atual.',
        )}
        {campo('confirmacao', 'Confirmar nova senha', {
          type: 'password',
          autoComplete: 'new-password',
          maxLength: 1024,
        })}
        {erroGeral && <Alerta>{erroGeral}</Alerta>}
        <Button type="submit" disabled={salvando} className="h-10 w-full">
          {salvando ? <SpinnerIcon className="animate-spin" /> : <FloppyDiskIcon />}
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </form>

      {ehProfessor && (
        <section className="flex flex-col gap-3 rounded-md border border-border p-5">
          <h2 className="text-base font-bold">Excluir conta</h2>
          <p className="text-sm text-muted-foreground">
            Só é possível excluir contas sem reservas, para preservar o histórico do CIn.
          </p>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              setErroExclusao('')
              setExcluindo(true)
            }}
          >
            <TrashIcon />
            Excluir minha conta
          </Button>
        </section>
      )}

      <Confirmacao
        aberto={excluindo}
        aoMudarAberto={setExcluindo}
        titulo="Excluir sua conta?"
        descricao="A conta será removida e você sairá do sistema. Esta ação não pode ser desfeita."
        rotuloConfirmar="Excluir conta"
        icone={TrashIcon}
        variante="destructive"
        processando={processandoExclusao}
        erro={erroExclusao}
        aoConfirmar={confirmarExclusao}
      />
    </div>
  )
}
