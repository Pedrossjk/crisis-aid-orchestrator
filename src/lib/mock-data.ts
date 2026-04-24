export type Urgency = "high" | "medium" | "low";
export type ActionStatus = "open" | "in_progress" | "completed";
export type HelpType = "money" | "food" | "transport" | "service" | "shelter" | "medical" | "supplies";

export interface CrisisAction {
  id: string;
  title: string;
  description: string;
  org: string;
  orgAvatar: string;
  location: string;
  distanceKm: number;
  urgency: Urgency;
  effort: string;
  helpTypes: HelpType[];
  volunteersNeeded: number;
  volunteersJoined: number;
  status: ActionStatus;
  isAiRecommended?: boolean;
  isCrisis?: boolean;
  postedAgo: string;
}

export interface Crisis {
  id: string;
  name: string;
  region: string;
  affected: number;
  activeActions: number;
  severity: Urgency;
  imageQuery: string;
}

export interface Volunteer {
  id: string;
  name: string;
  initials: string;
  skills: string[];
  matchScore: number;
  distanceKm: number;
  rating: number;
  completedActions: number;
}

export interface ResourceOffer {
  id: string;
  org: string;
  resource: string;
  category: HelpType;
  quantity: string;
  location: string;
  matchedNeeds: number;
}

export interface Request {
  id: string;
  description: string;
  helpType: HelpType;
  location: string;
  urgency: Urgency;
  postedAgo: string;
  status: "open" | "assigned";
  assignedTo?: string;
}

export const crises: Crisis[] = [
  { id: "c1", name: "Enchentes no Vale do Itajaí", region: "Santa Catarina", affected: 12400, activeActions: 38, severity: "high", imageQuery: "flood" },
  { id: "c2", name: "Seca no Sertão", region: "Pernambuco", affected: 8200, activeActions: 21, severity: "medium", imageQuery: "drought" },
  { id: "c3", name: "Deslizamentos Serra", region: "Rio de Janeiro", affected: 3100, activeActions: 14, severity: "high", imageQuery: "landslide" },
];

export const actions: CrisisAction[] = [
  {
    id: "a1",
    title: "Distribuição de cestas básicas — Blumenau",
    description: "Precisamos de voluntários para montagem e entrega de 500 cestas básicas para famílias desabrigadas pelas enchentes.",
    org: "Cruz Verde Brasil",
    orgAvatar: "CV",
    location: "Blumenau, SC",
    distanceKm: 2.4,
    urgency: "high",
    effort: "4h presencial",
    helpTypes: ["food", "transport"],
    volunteersNeeded: 20,
    volunteersJoined: 12,
    status: "open",
    isAiRecommended: true,
    isCrisis: true,
    postedAgo: "há 2h",
  },
  {
    id: "a2",
    title: "Motoristas para resgate de animais",
    description: "Buscamos pessoas com carro disponível para resgatar animais ilhados em áreas alagadas.",
    org: "Patas Solidárias",
    orgAvatar: "PS",
    location: "Itajaí, SC",
    distanceKm: 8.1,
    urgency: "high",
    effort: "6h, requer carro",
    helpTypes: ["transport", "service"],
    volunteersNeeded: 8,
    volunteersJoined: 5,
    status: "open",
    isAiRecommended: true,
    isCrisis: true,
    postedAgo: "há 30min",
  },
  {
    id: "a3",
    title: "Cozinheiros para refeições comunitárias",
    description: "Preparo de 200 refeições diárias em abrigo temporário. Buscamos voluntários com experiência em cozinha industrial.",
    org: "Mãos que Alimentam",
    orgAvatar: "MA",
    location: "Brusque, SC",
    distanceKm: 14.2,
    urgency: "medium",
    effort: "Manhã, 5 dias",
    helpTypes: ["food", "service"],
    volunteersNeeded: 6,
    volunteersJoined: 4,
    status: "open",
    isAiRecommended: true,
    postedAgo: "há 5h",
  },
  {
    id: "a4",
    title: "Atendimento médico voluntário",
    description: "Centro de atendimento precisa de profissionais de saúde para triagem em abrigo.",
    org: "Saúde Sem Fronteiras",
    orgAvatar: "SF",
    location: "Florianópolis, SC",
    distanceKm: 32.0,
    urgency: "high",
    effort: "Plantão 8h",
    helpTypes: ["medical"],
    volunteersNeeded: 4,
    volunteersJoined: 1,
    status: "open",
    isCrisis: true,
    postedAgo: "há 1h",
  },
  {
    id: "a5",
    title: "Suporte de TI para abrigo",
    description: "Configurar rede Wi-Fi e computadores doados em abrigo temporário para conectar famílias.",
    org: "TechAjuda",
    orgAvatar: "TA",
    location: "Joinville, SC",
    distanceKm: 22.5,
    urgency: "low",
    effort: "3h, conhecimento técnico",
    helpTypes: ["service"],
    volunteersNeeded: 2,
    volunteersJoined: 0,
    status: "open",
    postedAgo: "ontem",
  },
  {
    id: "a6",
    title: "Triagem de doações de roupas",
    description: "Organização e classificação de doações recebidas no centro de distribuição.",
    org: "Cruz Verde Brasil",
    orgAvatar: "CV",
    location: "Blumenau, SC",
    distanceKm: 2.8,
    urgency: "medium",
    effort: "4h presencial",
    helpTypes: ["supplies"],
    volunteersNeeded: 15,
    volunteersJoined: 9,
    status: "in_progress",
    postedAgo: "há 3 dias",
  },
];

export const matchedVolunteers: Volunteer[] = [
  { id: "v1", name: "Marina Costa", initials: "MC", skills: ["Cozinha", "Logística"], matchScore: 96, distanceKm: 1.2, rating: 4.9, completedActions: 23 },
  { id: "v2", name: "Rafael Souza", initials: "RS", skills: ["Direção", "Resgate"], matchScore: 94, distanceKm: 3.4, rating: 4.8, completedActions: 17 },
  { id: "v3", name: "Juliana Mendes", initials: "JM", skills: ["Saúde", "Triagem"], matchScore: 91, distanceKm: 5.1, rating: 5.0, completedActions: 41 },
  { id: "v4", name: "Pedro Almeida", initials: "PA", skills: ["TI", "Comunicação"], matchScore: 88, distanceKm: 7.0, rating: 4.7, completedActions: 12 },
];

export const resourceOffers: ResourceOffer[] = [
  { id: "r1", org: "Mercado Solidário", resource: "300 cestas básicas", category: "food", quantity: "300 un.", location: "Curitiba, PR", matchedNeeds: 4 },
  { id: "r2", org: "Frota Cidadã", resource: "Caminhões de transporte", category: "transport", quantity: "5 veículos", location: "Joinville, SC", matchedNeeds: 7 },
  { id: "r3", org: "Hospital São Lucas", resource: "Equipe médica", category: "medical", quantity: "12 profissionais", location: "Florianópolis, SC", matchedNeeds: 3 },
  { id: "r4", org: "Roupas pelo Bem", resource: "Lote de cobertores e agasalhos", category: "supplies", quantity: "1.200 itens", location: "Porto Alegre, RS", matchedNeeds: 9 },
];

export const requests: Request[] = [
  { id: "rq1", description: "Família com 3 crianças sem abrigo após desabamento", helpType: "shelter", location: "Petrópolis, RJ", urgency: "high", postedAgo: "há 20min", status: "open" },
  { id: "rq2", description: "Idoso precisa de medicamentos para hipertensão urgente", helpType: "medical", location: "Blumenau, SC", urgency: "high", postedAgo: "há 1h", status: "open" },
  { id: "rq3", description: "Comunidade rural sem água potável há 5 dias", helpType: "supplies", location: "Caruaru, PE", urgency: "medium", postedAgo: "há 4h", status: "assigned", assignedTo: "Cruz Verde Brasil" },
  { id: "rq4", description: "Transporte para tratamento médico semanal", helpType: "transport", location: "São Paulo, SP", urgency: "low", postedAgo: "há 1 dia", status: "open" },
];

export const helpTypeLabels: Record<HelpType, string> = {
  money: "Dinheiro",
  food: "Alimentos",
  transport: "Transporte",
  service: "Serviços",
  shelter: "Abrigo",
  medical: "Saúde",
  supplies: "Suprimentos",
};

export const urgencyLabels: Record<Urgency, string> = {
  high: "Urgente",
  medium: "Moderada",
  low: "Baixa",
};
