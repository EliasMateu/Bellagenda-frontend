<script setup lang="ts">
import type { SecaoLegal } from '~/utils/textosLegais'

defineProps<{ titulo: string, secoes: SecaoLegal[], versao: string }>()

// Divide "texto [[pendência]] texto" em pedaços; os entre colchetes duplos são TODOs destacados.
function pedacos(texto: string): { texto: string, todo: boolean }[] {
  return texto.split(/(\[\[.*?\]\])/g).filter(Boolean).map(t => (
    t.startsWith('[[') ? { texto: t.slice(2, -2), todo: true } : { texto: t, todo: false }
  ))
}
</script>

<template>
  <main class="pagina-publica doc">
    <p class="doc-voltar"><NuxtLink to="/"><UiIcon nome="chevron-esquerda" :tamanho="20" />Início</NuxtLink></p>
    <h1>{{ titulo }}</h1>
    <p class="aviso doc-aviso">Texto provisório, aguardando revisão jurídica (versão {{ versao }}).</p>

    <nav class="doc-sumario" aria-label="Sumário">
      <h2>Neste documento</h2>
      <ol>
        <li v-for="s in secoes" :key="s.id"><a :href="`#${s.id}`">{{ s.titulo.replace(/^\d+\.\s*/, '') }}</a></li>
      </ol>
    </nav>

    <article class="doc-corpo">
      <section v-for="s in secoes" :id="s.id" :key="s.id" tabindex="-1">
        <h2>{{ s.titulo }}</h2>
        <p v-for="(p, i) in s.paragrafos" :key="i">
          <template v-for="(parte, j) in pedacos(p)" :key="j">
            <mark v-if="parte.todo" class="doc-todo">{{ parte.texto }}</mark>
            <template v-else>{{ parte.texto }}</template>
          </template>
        </p>
      </section>
    </article>
  </main>
</template>
