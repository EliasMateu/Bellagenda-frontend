<script setup lang="ts">
/**
 * Calendário próprio. v-model: string AAAA-MM-DD (sem fuso). Abre em UiSheet.
 * Grade: Setas movem 1 dia / 1 semana; Home/End = domingo/sábado da semana; PageUp/PageDown = mês
 * anterior/próximo (Shift = ano); Enter/Espaço (ou clique) selecionam; Esc fecha. Dias fora de min/max ficam
 * desabilitados (aria-disabled). Botões anterior/próximo mês e Hoje.
 */
const props = defineProps<{
  id?: string
  label?: string
  placeholder?: string
  min?: string
  max?: string
  marked?: string[]
  today?: string
  disabled?: boolean
  erro?: boolean
  ariaLabel?: string
  variant?: 'campo' | 'compacto'
}>()
const modelo = defineModel<string>({ default: '' })

const uid = useId()
const aberto = ref(false)
const foco = ref('')
const hojeLocal = ref('')
const grade = ref<HTMLElement | null>(null)

onMounted(() => {
  hojeLocal.value = dataLocalDeHoje()
})

const hoje = computed(() => props.today || hojeLocal.value)
const dias = letrasSemana()
const marcados = computed(() => new Set(props.marked ?? []))

const semanas = computed(() => {
  if (!foco.value) return []
  const [y, m] = partesYmd(foco.value)
  const deslocamento = diaDaSemana(montarYmd(y, m, 1))
  const total = diasNoMes(y, m)
  const linhas: (string | null)[][] = []
  let n = 1 - deslocamento
  while (n <= total) {
    linhas.push(Array.from({ length: 7 }, (_, i) => {
      const d = n + i
      return d >= 1 && d <= total ? montarYmd(y, m, d) : null
    }))
    n += 7
  }
  return linhas
})

function desabilitado(ymd: string) {
  return (!!props.min && ymd < props.min) || (!!props.max && ymd > props.max)
}

function limitar(ymd: string) {
  if (props.min && ymd < props.min) return props.min
  if (props.max && ymd > props.max) return props.max
  return ymd
}

function abrir() {
  if (props.disabled) return
  foco.value = modelo.value || limitar(hoje.value || dataLocalDeHoje())
  aberto.value = true
}

function selecionar(ymd: string) {
  if (desabilitado(ymd)) return
  modelo.value = ymd
  aberto.value = false
}

async function mover(ymd: string) {
  foco.value = ymd
  await nextTick()
  grade.value?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus()
}

function aoTeclar(e: KeyboardEvent) {
  const f = foco.value
  const mapa: Record<string, () => string> = {
    ArrowLeft: () => somarDias(f, -1),
    ArrowRight: () => somarDias(f, 1),
    ArrowUp: () => somarDias(f, -7),
    ArrowDown: () => somarDias(f, 7),
    Home: () => somarDias(f, -diaDaSemana(f)),
    End: () => somarDias(f, 6 - diaDaSemana(f)),
    PageUp: () => somarMeses(f, e.shiftKey ? -12 : -1),
    PageDown: () => somarMeses(f, e.shiftKey ? 12 : 1),
  }
  const destino = mapa[e.key]
  if (destino) {
    e.preventDefault()
    void mover(destino())
  }
}

function irHoje() {
  const h = hoje.value
  if (!h) return
  if (desabilitado(h)) void mover(limitar(h))
  else selecionar(h)
}

const rotuloDia = (ymd: string) => {
  const extras = [ymd === hoje.value ? 'hoje' : '', marcados.value.has(ymd) ? 'com atendimentos' : '', desabilitado(ymd) ? 'indisponível' : '']
    .filter(Boolean).join(', ')
  return extras ? `${formatarDataLonga(ymd)}, ${extras}` : formatarDataLonga(ymd)
}
</script>

<template>
  <div class="ui-data" :class="{ compacto: variant === 'compacto' }">
    <button
      :id="id ?? `${uid}-gatilho`" type="button" class="ui-gatilho" aria-haspopup="dialog" :aria-expanded="aberto"
      :aria-label="ariaLabel" :aria-invalid="erro || undefined" :disabled="disabled" @click="abrir"
    >
      <UiIcon nome="calendario" :tamanho="20" />
      <span class="ui-valor" :class="{ 'ui-vazio': !modelo }">{{ modelo ? formatarDataCurta(modelo) : (placeholder ?? 'Escolher data') }}</span>
    </button>

    <UiSheet v-model="aberto" :titulo="label ?? 'Escolher data'">
      <div v-if="foco" class="calendario">
        <div class="calendario-topo">
          <button type="button" class="btn-icone" aria-label="Mês anterior" @click="foco = somarMeses(foco, -1)">
            <UiIcon nome="chevron-esquerda" />
          </button>
          <h3 :id="`${uid}-titulo`" aria-live="polite">{{ nomeMesAno(foco) }}</h3>
          <button type="button" class="btn-icone" aria-label="Próximo mês" @click="foco = somarMeses(foco, 1)">
            <UiIcon nome="chevron-direita" />
          </button>
        </div>
        <table ref="grade" class="calendario-grade" role="grid" :aria-labelledby="`${uid}-titulo`" @keydown="aoTeclar">
          <thead>
            <tr role="row">
              <th v-for="d in dias" :key="d.nome" role="columnheader" scope="col" :abbr="d.nome">
                <span aria-hidden="true">{{ d.letra }}</span><span class="somente-leitor">{{ d.nome }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(linha, i) in semanas" :key="i" role="row">
              <td
                v-for="(ymd, j) in linha" :key="j" role="gridcell"
                :aria-selected="ymd ? ymd === modelo : undefined"
              >
                <button
                  v-if="ymd" type="button" class="dia" :tabindex="ymd === foco ? 0 : -1"
                  :data-autofocus="ymd === foco ? '' : undefined" :aria-label="rotuloDia(ymd)"
                  :aria-disabled="desabilitado(ymd) || undefined" :aria-current="ymd === hoje ? 'date' : undefined"
                  :class="{ selecionado: ymd === modelo, hoje: ymd === hoje, bloqueado: desabilitado(ymd) }"
                  @click="selecionar(ymd)"
                >
                  <span class="dia-num">{{ numeroDoDia(ymd) }}</span>
                  <span v-if="marcados.has(ymd)" class="ponto" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="calendario-rodape">
          <button type="button" class="btn-secundario" @click="irHoje">Hoje</button>
        </p>
      </div>
    </UiSheet>
  </div>
</template>
