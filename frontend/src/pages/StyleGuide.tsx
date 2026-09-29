import {
  BuildingsIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  DesktopIcon,
  DotsThreeIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  SignOutIcon,
  UsersIcon,
  WarningCircleIcon,
  WarningIcon,
  WheelchairIcon,
} from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { contrastRatio, cssVar } from '@/lib/contrast'

// Esta é a única página que usa os primitivos (--cin-*) diretamente: ela documenta a paleta.
const RED_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const GRAY_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const MANUAL_GRAYS = new Set([400, 600, 800, 950])

const CONTRAST_PAIRS = [
  { label: 'Texto principal', fg: '--foreground', bg: '--background', min: 4.5 },
  { label: 'Texto secundário', fg: '--muted-foreground', bg: '--background', min: 4.5 },
  { label: 'Primária (texto/link)', fg: '--primary', bg: '--background', min: 4.5 },
  { label: 'Texto sobre primária', fg: '--primary-foreground', bg: '--primary', min: 4.5 },
  { label: 'Texto sobre hover', fg: '--primary-foreground', bg: '--primary-hover', min: 4.5 },
  { label: 'Erro (destructive)', fg: '--destructive', bg: '--background', min: 4.5 },
  { label: 'Borda de campo (input)', fg: '--input', bg: '--background', min: 3 },
  { label: 'Anel de foco', fg: '--ring', bg: '--background', min: 3 },
]

const ICONS = [
  { Icon: BuildingsIcon, name: 'Buildings' },
  { Icon: DesktopIcon, name: 'Desktop' },
  { Icon: UsersIcon, name: 'Users' },
  { Icon: MapPinIcon, name: 'MapPin' },
  { Icon: CalendarBlankIcon, name: 'CalendarBlank' },
  { Icon: ClockIcon, name: 'Clock' },
  { Icon: WheelchairIcon, name: 'Wheelchair' },
  { Icon: MagnifyingGlassIcon, name: 'MagnifyingGlass' },
  { Icon: CheckCircleIcon, name: 'CheckCircle' },
  { Icon: WarningIcon, name: 'Warning' },
  { Icon: InfoIcon, name: 'Info' },
  { Icon: SignOutIcon, name: 'SignOut' },
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 border-t border-border py-10">
      <h2 id={id} className="text-xl">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatch({ variable, label, note }: { variable: string; label: string; note?: string }) {
  // A página só roda no navegador, então os tokens já estão resolvidos no primeiro render.
  const [hex] = useState(() => cssVar(variable))
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 rounded-md ring-1 ring-foreground/10"
        style={{ background: `var(${variable})` }}
      />
      <div className="text-xs">
        <p className="font-bold">{label}</p>
        <p className="text-muted-foreground uppercase">{hex}</p>
        {note && <p className="text-muted-foreground italic">{note}</p>}
      </div>
    </div>
  )
}

function ContrastTable() {
  const [ratios] = useState(() =>
    CONTRAST_PAIRS.map(({ fg, bg }) => contrastRatio(cssVar(fg), cssVar(bg))),
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md text-left text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-4 font-normal">Par</th>
            <th className="py-2 pr-4 font-normal">Amostra</th>
            <th className="py-2 pr-4 font-normal">Razão</th>
            <th className="py-2 font-normal">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {CONTRAST_PAIRS.map(({ label, fg, bg, min }, i) => {
            const ratio = ratios[i]
            const passes = ratio >= min
            return (
              <tr key={label} className="border-b border-border">
                <td className="py-2 pr-4">{label}</td>
                <td className="py-2 pr-4">
                  <span
                    className="inline-block rounded-sm px-2 py-1 font-bold"
                    style={{ color: `var(${fg})`, background: `var(${bg})` }}
                  >
                    Aa
                  </span>
                </td>
                <td className="py-2 pr-4 tabular-nums">{ratio.toFixed(2)}:1</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1">
                    {passes ? (
                      <CheckCircleIcon />
                    ) : (
                      <WarningCircleIcon className="text-destructive" />
                    )}
                    {min}:1 {passes ? 'ok' : 'não passa'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function StyleGuide() {
  const [date, setDate] = useState<Date | undefined>(() => new Date())

  return (
    <div className="flex flex-col">
      <header className="flex max-w-2xl flex-col gap-4 pb-10">
        <p className="text-sm font-bold text-primary">Identidade visual</p>
        <h1 className="display text-3xl sm:text-4xl">Guia visual do CIn</h1>
        <p className="text-muted-foreground">
          Referência para construir as telas: paleta, tipografia, ícones e componentes com a
          identidade aplicada. Fonte de verdade: <code>docs/identidade-cin-ufpe.md</code>.
        </p>
      </header>

      <Section id="cores" title="Cores">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg">Oficiais</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch variable="--cin-offwhite" label="Off-white" note="fundo de tudo" />
            <Swatch variable="--cin-red-600" label="Vermelho CIn" note="acento, nunca fundo" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-lg">Rampa do vermelho</h3>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-11">
            {RED_STEPS.map((step) => (
              <Swatch
                key={step}
                variable={`--cin-red-${step}`}
                label={String(step)}
                note={step === 600 ? 'base' : step === 700 ? 'hover' : undefined}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-lg">Cinzas</h3>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-10">
            {GRAY_STEPS.map((step) => (
              <Swatch
                key={step}
                variable={`--cin-gray-${step}`}
                label={String(step)}
                note={MANUAL_GRAYS.has(step) ? 'manual' : 'interpolado'}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section id="contraste" title="Contraste">
        <ContrastTable />
      </Section>

      <Section id="tipografia" title="Tipografia">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Inter · opsz 18 · Regular, <em>Italic</em> e <strong>Bold</strong>
            </p>
            <h1 className="text-4xl">Título 64</h1>
            <h2 className="text-3xl">Título 48</h2>
            <h3 className="text-2xl">Título 32</h3>
            <h4 className="text-xl">Subtítulo 24</h4>
            <p className="text-lg">Texto de destaque 20</p>
            <p>
              Corpo 16. Reserve salas de aula, laboratórios e auditórios do Centro de Informática
              com antecedência e acompanhe o status da sua solicitação.
            </p>
            <p className="text-sm text-muted-foreground">Texto secundário 14</p>
            <small className="text-xs italic">Nota 12 em itálico, para legendas e apoio.</small>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              DM Serif Display · só em manchetes e chamadas humanas, em itálico
            </p>
            <p className="display text-4xl">Pessoas, ideias e encontros.</p>
            <p className="display text-2xl">Um lugar para cada aula.</p>
            <p className="text-sm text-muted-foreground">
              Interfaces operacionais (formulários, tabelas, painéis) usam só Inter.
            </p>
          </div>
        </div>
      </Section>

      <Section id="icones" title="Ícones">
        <p className="text-sm text-muted-foreground">
          Phosphor, sempre no peso Fill, mínimo 16px, herdando a cor do contexto.
        </p>
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {ICONS.map(({ Icon, name }) => (
            <li key={name} className="flex flex-col items-center gap-2 text-xs">
              <Icon size={24} />
              {name}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="inline-flex items-center gap-2 text-primary">
            <MapPinIcon size={20} /> Fundo claro: vermelho
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPinIcon size={20} /> ou preto
          </span>
          <span className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground">
            <MapPinIcon size={20} /> Fundo colorido: off-white
          </span>
        </div>
      </Section>

      <Section id="componentes" title="Componentes">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg">Botões</h3>
          <p className="text-sm text-muted-foreground">
            Um botão primário por tela: o vermelho é acento.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <PlusIcon data-icon="inline-start" />
              Nova reserva
            </Button>
            <Button variant="outline">Cancelar</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">
              <WarningCircleIcon data-icon="inline-start" />
              Rejeitar
            </Button>
            <Button disabled>Desabilitado</Button>
            <Button size="icon" variant="outline" aria-label="Mais opções">
              <DotsThreeIcon />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-lg">Badges de status</h3>
          <p className="text-sm text-muted-foreground">
            Estado nunca só pela cor: sempre ícone + texto.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <ClockIcon data-icon="inline-start" />
              Pendente
            </Badge>
            <Badge variant="secondary">
              <CheckCircleIcon data-icon="inline-start" />
              Aprovada
            </Badge>
            <Badge variant="destructive">
              <WarningCircleIcon data-icon="inline-start" />
              Rejeitada
            </Badge>
            <Badge>Destaque</Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Formulário</CardTitle>
              <CardDescription>Campos com label, placeholder, erro e seleção.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sg-email">E-mail institucional</Label>
                <Input id="sg-email" type="email" placeholder="nome@cin.ufpe.br" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sg-capacidade">Capacidade</Label>
                <Input
                  id="sg-capacidade"
                  type="number"
                  defaultValue={-1}
                  aria-invalid
                  aria-describedby="sg-capacidade-erro"
                />
                <p
                  id="sg-capacidade-erro"
                  className="flex items-center gap-1 text-sm text-destructive"
                >
                  <WarningCircleIcon /> Informe um número maior que zero.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sg-tipo">Tipo de espaço</Label>
                <Select>
                  <SelectTrigger id="sg-tipo" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sala">Sala de aula</SelectItem>
                    <SelectItem value="lab">Laboratório</SelectItem>
                    <SelectItem value="auditorio">Auditório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abas</CardTitle>
              <CardDescription>Navegação entre visões de uma mesma tela.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="minhas">
                <TabsList>
                  <TabsTrigger value="minhas">Minhas reservas</TabsTrigger>
                  <TabsTrigger value="buscar">Buscar espaço</TabsTrigger>
                </TabsList>
                <TabsContent value="minhas" className="pt-4 text-muted-foreground">
                  Lista das suas solicitações.
                </TabsContent>
                <TabsContent value="buscar" className="pt-4 text-muted-foreground">
                  Filtros de disponibilidade.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobreposições</CardTitle>
              <CardDescription>Diálogo, menu, popover e notificações.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir diálogo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeitar reserva?</DialogTitle>
                    <DialogDescription>
                      O professor será notificado. Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Voltar</Button>
                    </DialogClose>
                    <Button variant="destructive">Rejeitar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Conta</DropdownMenuLabel>
                  <DropdownMenuItem>Minhas reservas</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <SignOutIcon />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Popover</Button>
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  Laboratório com 40 computadores e projetor.
                </PopoverContent>
              </Popover>

              <Button variant="outline" onClick={() => toast.success('Reserva solicitada.')}>
                Toast de sucesso
              </Button>
              <Button variant="outline" onClick={() => toast.error('Horário indisponível.')}>
                Toast de erro
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
              <CardDescription>Seleção de data para reservas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border border-border"
              />
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  )
}
