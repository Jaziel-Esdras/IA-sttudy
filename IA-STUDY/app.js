class StudyPlanner {
  constructor(dailyGoalMinutes = 120) {
    this.dailyGoalMinutes = dailyGoalMinutes;
    this.topics = [];
    this.links = [];
  }

  sortedTopics() {
    return [...this.topics].sort((a, b) => b.priority - a.priority || a.estimatedMinutes - b.estimatedMinutes);
  }

  planForDay() {
    const plan = [];
    let remaining = this.dailyGoalMinutes;

    for (const topic of this.sortedTopics()) {
      if (topic.completed) continue;
      if (topic.estimatedMinutes <= remaining) {
        plan.push(topic);
        remaining -= topic.estimatedMinutes;
      }
    }

    return plan;
  }
}

class StudyAssistant {
  constructor(planner) {
    this.planner = planner;
  }

  getStatus() {
    const total = this.planner.topics.length;
    const completed = this.planner.topics.filter((topic) => topic.completed).length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      percentage: total ? Math.round((completed / total) * 100) : 0,
      plan: this.planner.planForDay().map((topic) => topic.name)
    };
  }

  suggestFocus() {
    return this.planner.sortedTopics().filter((topic) => !topic.completed).slice(0, 3).map((topic) => topic.name);
  }

  generateQuiz(topicName, quantity = 3) {
    return Array.from({ length: quantity }, (_, index) => ({
      id: index + 1,
      text: `${index + 1}. Explique os pontos principais de ${topicName} e descreva sua conclusão em 3 frases.`
    }));
  }

  summarizeLink(link) {
    const source = new URL(link.url).hostname.replace('www.', '');
    const notes = link.notes && link.notes.length ? link.notes.join(' ') : 'Nenhum comentário extra foi registrado.';
    const tagText = link.tags && link.tags.length ? link.tags.join(', ') : 'sem tags';

    return {
      title: link.title,
      source,
      category: link.category,
      summary: `Resumo do material: ${link.title} | categoria=${link.category} | fonte=${source} | tags=${tagText} | principais ideias: ${notes}`
    };
  }
}

const planner = new StudyPlanner(120);
const assistant = new StudyAssistant(planner);

function readState() {
  const data = StudyFlow.getData();
  const topics = data.topics || [];
  const links = data.links || [];

  planner.topics = topics.map((topic) => ({ ...topic, completed: Boolean(topic.completed) }));
  planner.links = links;
  planner.dailyGoalMinutes = 120;
}

function writeState() {
  const data = StudyFlow.getData();
  data.topics = planner.topics;
  data.links = planner.links;
  StudyFlow.saveData(data);
}

const planList = document.getElementById('planList');
const linkSummary = document.getElementById('linkSummary');
const quickSummary = document.getElementById('quickSummary');
const quizList = document.getElementById('quizList');
const topicsList = document.getElementById('topicsList');
const allSubjectsGrid = document.getElementById('allSubjectsGrid');
const subjectCatalog = document.getElementById('subjectCatalog');
const progressPercent = document.getElementById('progressPercent');
const progressText = document.getElementById('progressText');
const progressPercentSecondary = document.getElementById('progressPercentSecondary');
const progressTextSecondary = document.getElementById('progressTextSecondary');
const dailyGoalLabel = document.getElementById('dailyGoalLabel');
const focusLabel = document.getElementById('focusLabel');

function renderPlan() {
  if (!planList) return;

  const plan = planner.planForDay();
  const items = plan.length
    ? plan.map((topic) => `<li><strong>${topic.name}</strong><span>${topic.estimatedMinutes} min • ${topic.difficulty}</span></li>`).join('')
    : '<li><strong>Sem tarefas no momento</strong><span>Adicione mais matérias para montar o plano.</span></li>';

  planList.innerHTML = items;

  if (dailyGoalLabel) {
    dailyGoalLabel.textContent = `${planner.dailyGoalMinutes} min`;
  }

  if (focusLabel) {
    const focus = assistant.suggestFocus();
    focusLabel.textContent = `${focus.length} itens`;
  }
}

function renderLinks() {
  if (!linkSummary) return;

  const summaries = planner.links.map((link) => assistant.summarizeLink(link));

  linkSummary.innerHTML = summaries.map((item) => `
    <div class="summary-card">
      <strong>${item.title}</strong>
      <p>${item.summary}</p>
    </div>
  `).join('');
}

function renderQuiz() {
  if (!quizList) return;

  const topics = planner.topics.slice(0, 2);
  const questions = topics.flatMap((topic) => assistant.generateQuiz(topic.name, 2));

  quizList.innerHTML = questions.map((question) => `<li>${question.text}</li>`).join('');
}

function renderTopics() {
  if (!topicsList) return;
  topicsList.innerHTML = planner.topics.map((topic) => `
    <li>
      <strong>${topic.name}</strong>
      <span>Prioridade ${topic.priority} • ${topic.estimatedMinutes} min • ${topic.difficulty}</span>
    </li>
  `).join('');
}

function renderAllSubjects() {
  const subjects = planner.topics;

  const subjectCards = subjects.map((topic) => {
    const linksForTopic = planner.links.filter((link) => {
      const haystack = `${link.title} ${link.category} ${link.tags.join(' ')}`.toLowerCase();
      return haystack.includes(topic.name.toLowerCase());
    });

    return `
      <div class="subject-card">
        <h4>${topic.name}</h4>
        <span class="subject-meta">Prioridade ${topic.priority} • ${topic.estimatedMinutes} min</span>
        <span class="subject-meta">Nível: ${topic.difficulty}</span>
        <span class="subject-meta">Links: ${linksForTopic.length}</span>
        <button type="button">Acessar matéria</button>
      </div>
    `;
  }).join('');

  if (allSubjectsGrid) {
    allSubjectsGrid.innerHTML = subjects.length ? subjectCards : '<div class="subject-card"><h4>Nenhuma matéria cadastrada</h4><span class="subject-meta">Adicione uma disciplina para ela aparecer aqui.</span></div>';
  }

  if (subjectCatalog) {
    subjectCatalog.innerHTML = subjects.length ? subjectCards : '<div class="subject-card"><h4>Nenhuma matéria cadastrada</h4><span class="subject-meta">Cadastre uma disciplina para ela aparecer aqui.</span></div>';
  }
}

function renderStatus() {
  if (!progressPercent || !progressText) return;

  const status = assistant.getStatus();
  const summaryText = status.completed > 0 ? `${status.completed} tarefas concluídas` : 'Nenhuma tarefa concluída ainda';

  progressPercent.textContent = `${status.percentage}%`;
  progressText.textContent = summaryText;

  if (progressPercentSecondary) {
    progressPercentSecondary.textContent = `${status.percentage}%`;
  }

  if (progressTextSecondary) {
    progressTextSecondary.textContent = summaryText;
  }

  if (focusLabel) {
    const focus = assistant.suggestFocus();
    if (focus.length) {
      focusLabel.textContent = focus[0];
    }
  }
}

function handleTopicSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('topicName').value.trim();
  const priority = document.getElementById('topicPriority').value;
  const minutes = document.getElementById('topicMinutes').value;
  const difficulty = document.getElementById('topicDifficulty').value;

  if (!name) return;

  const data = StudyFlow.getData();
  data.topics.push({
    id: Date.now(),
    name,
    priority: Number(priority),
    estimatedMinutes: Number(minutes),
    difficulty,
    completed: false
  });
  StudyFlow.saveData(data);

  document.getElementById('topicForm').reset();
  document.getElementById('topicPriority').value = 3;
  document.getElementById('topicMinutes').value = 45;
  readState();
  renderAll();
}

function handleLinkSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('linkTitle').value.trim();
  const url = document.getElementById('linkUrl').value.trim();
  const category = document.getElementById('linkCategory').value.trim() || 'geral';
  const tags = document.getElementById('linkTags').value.trim();

  if (!title || !url) return;

  const data = StudyFlow.getData();
  data.links.push({
    id: Date.now(),
    title,
    url,
    category,
    tags: tags ? tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    notes: ['Material de apoio adicionado para revisão.']
  });
  StudyFlow.saveData(data);

  document.getElementById('linkForm').reset();
  document.getElementById('linkCategory').value = 'geral';
  readState();
  renderAll();
}

function renderQuickSummary() {
  if (!quickSummary) return;

  const status = assistant.getStatus();
  const focus = assistant.suggestFocus();

  quickSummary.innerHTML = `
    <div class="summary-card">
      <strong>Progresso geral</strong>
      <p>${status.percentage}% concluído • ${status.completed} de ${status.total} matérias.</p>
    </div>
    <div class="summary-card">
      <strong>Foco principal</strong>
      <p>${focus.length ? focus.join(', ') : 'Nenhuma matéria pendente.'}</p>
    </div>
  `;
}

function renderAll() {
  readState();
  renderStatus();
  renderPlan();
  renderLinks();
  renderQuickSummary();
  renderQuiz();
  renderTopics();
  renderAllSubjects();
}

function init() {
  readState();
  renderAll();

  const topicForm = document.getElementById('topicForm');
  const linkForm = document.getElementById('linkForm');
  const askForm = document.getElementById('askForm');

  if (topicForm) topicForm.addEventListener('submit', handleTopicSubmit);
  if (linkForm) linkForm.addEventListener('submit', handleLinkSubmit);
  if (askForm) askForm.addEventListener('submit', handleAskSubmit);
}

init();

// --- Assistant integration ---
async function handleAskSubmit(event) {
  event.preventDefault();

  const prompt = document.getElementById('askPrompt').value.trim();
  const category = document.getElementById('askCategory').value.trim() || null;
  if (!prompt) return;

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, category }),
    });
    if (!res.ok) throw new Error('Erro ao consultar assistente');
    const data = await res.json();
    renderAssistant(data);
  } catch (err) {
    const el = document.getElementById('assistantSummary');
    if (el) el.innerHTML = `<div class="empty-state">Não foi possível contactar o backend: ${err.message}</div>`;
  }
}

function renderAssistant(data) {
  const el = document.getElementById('assistantSummary');
  if (!el) return;

  const resumo = data.resumo || data.summary || '';
  const links = data.video_links || data.videoLinks || [];

  el.innerHTML = `
    <div class="summary-card">
      <strong>Resumo</strong>
      <p>${resumo}</p>
    </div>
    <div class="summary-card">
      <strong>Vídeos / Materiais sugeridos</strong>
      <ul>
        ${links.map((l) => `<li><a href="${l}" target="_blank" rel="noreferrer">${l}</a></li>`).join('')}
      </ul>
    </div>
  `;
}
