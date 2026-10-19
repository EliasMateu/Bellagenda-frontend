// Textos PROVISÓRIOS dos Termos de Uso e da Política de Privacidade (aguardam revisão jurídica).
// Trechos entre [[colchetes duplos]] são pendências (TODO) e aparecem destacados na página.
// Não contêm dados jurídicos inventados: CNPJ, endereço e encarregado ficam como TODO.

export interface SecaoLegal { id: string, titulo: string, paragrafos: string[] }

export const TERMOS: SecaoLegal[] = [
  {
    id: 'quem-somos', titulo: '1. Quem somos',
    paragrafos: [
      'O Bela Agenda é uma plataforma de agendamento online para profissionais de manicure. Ele é um projeto acadêmico, em desenvolvimento, e ainda não é um serviço comercial.',
      'Dados da operadora: [[TODO: razão social, CNPJ e endereço, se houver]].',
    ],
  },
  {
    id: 'o-servico', titulo: '2. O que o serviço faz',
    paragrafos: [
      'A plataforma permite que a profissional cadastre seus serviços e horários, e que suas clientes escolham um horário disponível. A plataforma não presta o serviço de manicure: o atendimento é de responsabilidade da profissional.',
    ],
  },
  {
    id: 'conta', titulo: '3. Sua conta',
    paragrafos: [
      'Para usar o painel, a profissional cria uma conta. Todo cadastro passa por análise da equipe antes de ser liberado, e a equipe pode aprovar, recusar ou suspender contas.',
      'Você é responsável por manter sua senha em segredo e por usar dados verdadeiros no cadastro.',
    ],
  },
  {
    id: 'uso', titulo: '4. Uso adequado',
    paragrafos: [
      'Não é permitido usar a plataforma para fins ilícitos, tentar acessar dados de outras pessoas ou prejudicar o funcionamento do serviço.',
    ],
  },
  {
    id: 'disponibilidade', titulo: '5. Disponibilidade e responsabilidade',
    paragrafos: [
      'Por ser um projeto acadêmico, o serviço pode ficar indisponível ou mudar sem aviso prévio. [[TODO: limites de responsabilidade, a definir com a revisão jurídica]].',
    ],
  },
  {
    id: 'mudancas', titulo: '6. Mudanças nestes termos',
    paragrafos: [
      'Estes termos podem mudar. Cada versão tem um número, e o aceite fica registrado com a versão e a data. Mudanças relevantes serão avisadas.',
    ],
  },
  {
    id: 'contato', titulo: '7. Contato',
    paragrafos: ['Fale com a equipe pelo WhatsApp: [[CONTATO_DA_EQUIPE (TODO)]].'],
  },
]

export const PRIVACIDADE: SecaoLegal[] = [
  {
    id: 'quem-somos', titulo: '1. Quem somos',
    paragrafos: [
      'O Bela Agenda é uma plataforma de agendamento online para profissionais de manicure, mantida como projeto acadêmico. Esta política explica como os dados pessoais são tratados.',
    ],
  },
  {
    id: 'dados', titulo: '2. Quais dados coletamos',
    paragrafos: [
      'Da profissional: nome de exibição, telefone (WhatsApp), usuário, senha (guardada de forma protegida, nunca em texto aberto), link da agenda, e o registro do aceite dos termos (versão e data).',
      'Das clientes: nome, telefone e os dados de cada agendamento (serviço, data, horário e observação opcional).',
    ],
  },
  {
    id: 'finalidade', titulo: '3. Para que usamos',
    paragrafos: [
      'Os dados servem para criar e analisar contas, permitir agendamentos, avisar sobre o andamento do cadastro ou do horário, e manter a plataforma segura.',
    ],
  },
  {
    id: 'base-legal', titulo: '4. Base legal (em linhas gerais)',
    paragrafos: [
      'O tratamento se apoia, em geral, na execução do serviço solicitado e no consentimento da pessoa. [[TODO: detalhar as bases legais da LGPD com a revisão jurídica]].',
    ],
  },
  {
    id: 'papeis', titulo: '5. Quem decide sobre os dados',
    paragrafos: [
      'A profissional decide sobre os dados das clientes dela (como controladora desses dados). A plataforma Bela Agenda opera o sistema em nome dela. A equipe da plataforma não acessa clientes nem agendamentos das profissionais na área de administração de contas.',
      'Encarregado pelo tratamento de dados: [[TODO: nome e contato, se aplicável]].',
    ],
  },
  {
    id: 'compartilhamento', titulo: '6. Com quem compartilhamos',
    paragrafos: [
      'Não compartilhamos dados com terceiros, exceto o provedor de hospedagem necessário para o sistema funcionar. [[TODO: nome do provedor e país]].',
    ],
  },
  {
    id: 'retencao', titulo: '7. Por quanto tempo guardamos',
    paragrafos: [
      'Guardamos os dados enquanto a conta existir ou for necessário para o serviço. [[TODO: prazos de retenção e de anonimização]].',
    ],
  },
  {
    id: 'direitos', titulo: '8. Seus direitos',
    paragrafos: [
      'Você pode pedir acesso, correção, anonimização ou exclusão dos seus dados, e a revogação do consentimento. Para exercer esses direitos, fale com a equipe pelo WhatsApp: [[CONTATO_DA_EQUIPE (TODO)]]. Se for cliente de uma profissional, também pode falar diretamente com ela.',
    ],
  },
  {
    id: 'seguranca', titulo: '9. Segurança',
    paragrafos: [
      'Usamos conexão protegida, senhas guardadas com proteção, controle de acesso por conta e limites contra abuso. Nenhum sistema é totalmente livre de riscos, e este projeto ainda está em evolução.',
    ],
  },
  {
    id: 'mudancas', titulo: '10. Mudanças desta política',
    paragrafos: ['Esta política pode ser atualizada. A versão em vigor aparece no topo desta página.'],
  },
]
