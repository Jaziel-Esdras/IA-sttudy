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
  planner.dailyGoalMinutes = data.dailyGoalMinutes || 120;
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

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(date, days) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function formatStudyTime(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function safeStudyText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function secondsOnDay(sessions, day) {
  return sessions.reduce((total, session) => total + (session.day === day ? Number(session.seconds) || 0 : 0), 0);
}

function renderStudyGamification() {
  const chart = document.getElementById('studyChart');
  if (!chart) return;

  const data = StudyFlow.getData();
  const sessions = data.studySessions || [];
  const goalSeconds = Math.max(1, Number(data.dailyGoalMinutes) || 120) * 60;
  const today = new Date();
  const todayKey = localDayKey(today);
  const todaySeconds = secondsOnDay(sessions, todayKey);
  const percent = Math.floor((todaySeconds / goalSeconds) * 100);
  const todayGoalInput = document.getElementById('studyGoalInput');
  if (todayGoalInput && document.activeElement !== todayGoalInput) todayGoalInput.value = String(data.dailyGoalMinutes || 120);

  document.getElementById('todayStudyTime').textContent = formatStudyTime(todaySeconds);
  document.getElementById('todayGoalPercent').textContent = `${percent}%`;
  document.getElementById('todayGoalProgress').style.width = `${Math.min(100, percent)}%`;
  document.getElementById('todayGoalMessage').textContent = todaySeconds >= goalSeconds
    ? 'Meta diária concluída! Continue no seu ritmo.'
    : `${formatStudyTime(Math.max(0, goalSeconds - todaySeconds))} para alcançar sua meta de hoje.`;
  document.getElementById('dailyGoalLabel').textContent = `${data.dailyGoalMinutes || 120} min`;

  const subjectSelect = document.getElementById('studySubject');
  if (subjectSelect) {
    const currentValue = subjectSelect.value;
    const options = ['<option value="">Estudo livre</option>', ...planner.topics.map((topic) => `<option value="${safeStudyText(topic.name)}">${safeStudyText(topic.name)}</option>`)];
    subjectSelect.innerHTML = options.join('');
    if (planner.topics.some((topic) => topic.name === currentValue)) subjectSelect.value = currentValue;
  }

  const timerButton = document.getElementById('studyTimerButton');
  const timerStatus = document.getElementById('studyTimerStatus');
  if (data.activeStudyTimer) {
    const start = new Date(data.activeStudyTimer.startedAt).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    timerButton.textContent = `■ Encerrar sessão · ${hrs}:${mins}:${secs}`;
    timerButton.classList.add('timer-running');
    timerStatus.textContent = `Cronômetro ativo${data.activeStudyTimer.subject ? ` · ${data.activeStudyTimer.subject}` : ''}. Você pode sair da página; o tempo continuará contando.`;
  } else {
    timerButton.textContent = '▶ Iniciar cronômetro';
    timerButton.classList.remove('timer-running');
    timerStatus.textContent = 'O tempo será salvo quando você encerrar a sessão.';
  }

  const recentDays = Array.from({ length: 7 }, (_, index) => shiftLocalDate(today, index - 6));
  const dailyTotals = recentDays.map((date) => ({ date, key: localDayKey(date), seconds: secondsOnDay(sessions, localDayKey(date)) }));
  const recentWeekSeconds = dailyTotals.reduce((total, item) => total + item.seconds, 0);
  const previousWeekSeconds = Array.from({ length: 7 }, (_, index) => localDayKey(shiftLocalDate(today, index - 13)))
    .reduce((total, day) => total + secondsOnDay(sessions, day), 0);
  document.getElementById('weeklyStudyTime').textContent = formatStudyTime(recentWeekSeconds);
  document.getElementById('weeklyStudyStat').textContent = formatStudyTime(recentWeekSeconds);
  document.getElementById('previousWeeklyStudyTime').textContent = formatStudyTime(previousWeekSeconds);
  const comparison = document.getElementById('weeklyComparisonText');
  if (recentWeekSeconds === previousWeekSeconds) {
    comparison.textContent = recentWeekSeconds ? 'Mesmo tempo de estudo que nos 7 dias anteriores.' : 'Registre sessões para comparar seu ritmo.';
  } else {
    const change = Math.round(Math.abs(recentWeekSeconds - previousWeekSeconds) / 60);
    comparison.textContent = recentWeekSeconds > previousWeekSeconds
      ? `Você estudou ${formatStudyTime(change * 60)} a mais que nos 7 dias anteriores.`
      : `Você estudou ${formatStudyTime(change * 60)} a menos que nos 7 dias anteriores.`;
  }

  const maxSeconds = Math.max(goalSeconds, ...dailyTotals.map((item) => item.seconds), 1);
  chart.innerHTML = dailyTotals.map(({ date, key, seconds }) => {
    const height = seconds ? Math.max(5, Math.round((seconds / maxSeconds) * 100)) : 2;
    const label = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const value = seconds ? Math.round(seconds / 60) : 0;
    return `<div class="study-chart-day" title="${date.toLocaleDateString('pt-BR')}: ${formatStudyTime(seconds)}"><span class="study-chart-value">${value || ''}</span><div class="study-chart-track"><div class="study-chart-bar ${key === todayKey ? 'is-today' : ''}" style="height:${height}%"></div></div><span class="study-chart-label">${label}</span></div>`;
  }).join('');

  let streak = 0;
  let streakDate = today;
  if (todaySeconds < goalSeconds) streakDate = shiftLocalDate(today, -1);
  for (let day = 0; day < 365; day += 1) {
    if (secondsOnDay(sessions, localDayKey(streakDate)) < goalSeconds) break;
    streak += 1;
    streakDate = shiftLocalDate(streakDate, -1);
  }
  document.getElementById('studyStreak').textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;

  const totalSeconds = sessions.reduce((sum, session) => sum + (Number(session.seconds) || 0), 0);
  const points = Math.floor(totalSeconds / (25 * 60)) * 10;
  const level = Math.floor(points / 100) + 1;
  document.getElementById('studyLevel').textContent = `Nível ${level} · ${points} XP`;
  const badges = [];
  if (todaySeconds >= goalSeconds) badges.push('<span class="study-badge earned">🏆 Meta de hoje</span>');
  if (streak >= 3) badges.push('<span class="study-badge earned">🔥 3 dias seguidos</span>');
  if (totalSeconds >= 5 * 3600) badges.push('<span class="study-badge earned">📚 5 horas estudadas</span>');
  if (!badges.length) badges.push('<span class="study-badge next-badge">🎯 Próxima conquista: bata sua meta diária</span>');
  document.getElementById('studyBadges').innerHTML = badges.join('');
}

function saveStudySession(seconds, subject, day = localDayKey()) {
  const data = StudyFlow.getData();
  data.studySessions = data.studySessions || [];
  data.studySessions.push({ id: Date.now(), seconds, subject: subject || '', day, createdAt: new Date().toISOString() });
  StudyFlow.saveData(data);
  renderStudyGamification();
}

function handleStudyTimer() {
  const data = StudyFlow.getData();
  if (data.activeStudyTimer) {
    const active = data.activeStudyTimer;
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
    data.studySessions = data.studySessions || [];
    data.studySessions.push({
      id: Date.now(), seconds: elapsedSeconds, subject: active.subject || '',
      day: active.day || localDayKey(new Date(active.startedAt)), createdAt: new Date().toISOString()
    });
    data.activeStudyTimer = null;
    StudyFlow.saveData(data);
  } else {
    data.activeStudyTimer = {
      startedAt: new Date().toISOString(),
      day: localDayKey(),
      subject: document.getElementById('studySubject').value
    };
    StudyFlow.saveData(data);
  }
  renderStudyGamification();
}

function handleQuickStudySubmit(event) {
  event.preventDefault();
  const minutes = Number(document.getElementById('quickStudyMinutes').value);
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  saveStudySession(Math.round(minutes * 60), document.getElementById('studySubject').value);
  event.currentTarget.reset();
}

function handleStudyGoalSubmit(event) {
  event.preventDefault();
  const minutes = Math.min(600, Math.max(15, Number(document.getElementById('studyGoalInput').value) || 120));
  const data = StudyFlow.getData();
  data.dailyGoalMinutes = minutes;
  StudyFlow.saveData(data);
  readState();
  renderStudyGamification();
  renderPlan();
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
  renderStudyGamification();
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

  const studyTimerButton = document.getElementById('studyTimerButton');
  const quickStudyForm = document.getElementById('quickStudyForm');
  const studyGoalForm = document.getElementById('studyGoalForm');
  if (studyTimerButton) studyTimerButton.addEventListener('click', handleStudyTimer);
  if (quickStudyForm) quickStudyForm.addEventListener('submit', handleQuickStudySubmit);
  if (studyGoalForm) studyGoalForm.addEventListener('submit', handleStudyGoalSubmit);
  if (studyTimerButton) window.setInterval(() => { if (StudyFlow.getData().activeStudyTimer) renderStudyGamification(); }, 1000);
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
