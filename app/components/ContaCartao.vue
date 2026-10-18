<script setup lang="ts">
import type { AcaoConta, ContaBackoffice } from '~/composables/useBackoffice'

/** Cartão de uma conta no backoffice: identificação, situação e ações conforme a matriz de transições. */
const props = defineProps<{ conta: ContaBackoffice }>()
defineEmits<{ acao: [acao: AcaoConta], detalhes: [] }>()

const acoes = computed(() => ACOES_CONTA[props.conta.status])
</script>

<template>
  <li class="cartao-gestao conta-card" :data-status="conta.status">
    <div class="cg-cab">
      <span class="avatar-cliente" aria-hidden="true">{{ iniciaisDe(conta.nome_exibicao) }}</span>
      <div class="cg-texto">
        <h3 class="cg-nome">{{ conta.nome_exibicao }}</h3>
        <p class="conta-selo">
          <span class="distintivo-status" :data-status="conta.status">{{ ROTULO_STATUS[conta.status] }}</span>
        </p>
        <p class="cg-sec">@{{ conta.username }} · /p/{{ conta.slug }}</p>
        <p v-if="conta.telefone" class="cg-sec">{{ formatarTelefoneBR(conta.telefone) }}</p>
        <p class="cg-sec">Cadastrada em {{ dataHoraSP(conta.cadastrado_em) }}</p>
      </div>
    </div>

    <div v-if="acoes.length" class="cg-acoes conta-acoes">
      <button
        v-for="a in acoes" :key="a" type="button" :class="a === 'aprovar' || a === 'reativar' ? 'btn-primario' : (a === 'rejeitar' ? 'btn-perigo' : 'btn-secundario')"
        @click="$emit('acao', a)"
      >
        {{ ROTULO_ACAO[a] }}
      </button>
    </div>
    <div class="cg-acoes conta-sec">
      <button type="button" class="btn-secundario" @click="$emit('detalhes')">Ver detalhes</button>
      <a
        v-if="conta.telefone" :href="linkWhatsAppConta(conta)" class="btn btn-secundario btn-icone" target="_blank"
        rel="noopener noreferrer" :aria-label="`Chamar ${conta.nome_exibicao} no WhatsApp`" title="Chamar no WhatsApp"
      >
        <UiIcon nome="whatsapp" :tamanho="20" />
      </a>
    </div>
  </li>
</template>
