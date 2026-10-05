window.StudyFlow = (() => {
  const STORAGE_KEY = 'studyflow_data';

  const defaultData = {
    topics: [
      { id: 1, name: 'Matemática', priority: 5, estimatedMinutes: 50, difficulty: 'alta', completed: false },
      { id: 2, name: 'História', priority: 3, estimatedMinutes: 30, difficulty: 'média', completed: false },
      { id: 3, name: 'Física', priority: 4, estimatedMinutes: 40, difficulty: 'alta', completed: false },
      { id: 4, name: 'Literatura', priority: 2, estimatedMinutes: 20, difficulty: 'baixa', completed: false },
    ],
    links: [
      {
        id: 1,
        title: 'Algoritmos e estruturas de dados',
        url: 'https://www.youtube.com/watch?v=abc123',
        category: 'programação',
        tags: ['lista', 'pilha'],
        notes: ['Explica listas e pilhas com exemplos simples.']
      },
      {
        id: 2,
        title: 'Resumo de História antiga',
        url: 'https://pt.wikipedia.org/wiki/Hist%C3%B3ria_antiga',
        category: 'história',
        tags: ['civilizações', 'revisão'],
        notes: ['Conceitos básicos e principais civilizações.']
      }
    ],
    dailyGoalMinutes: 120,
    studySessions: [],
    activeStudyTimer: null,
    tasks: [
      { id: 1, title: 'Revisar exercícios de matemática', done: false, priority: 'alta' },
      { id: 2, title: 'Ler resumo de história', done: false, priority: 'média' },
      { id: 3, title: 'Assistir vídeo de física', done: true, priority: 'alta' }
    ]
  };

  const getData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return structuredClone(defaultData);
      }
      const parsed = JSON.parse(raw);
      return {
        topics: parsed.topics || [],
        links: parsed.links || [],
        tasks: parsed.tasks || [],
        dailyGoalMinutes: Number(parsed.dailyGoalMinutes) > 0 ? Number(parsed.dailyGoalMinutes) : 120,
        studySessions: Array.isArray(parsed.studySessions) ? parsed.studySessions : [],
        activeStudyTimer: parsed.activeStudyTimer || null
      };
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return structuredClone(defaultData);
    }
  };

  const saveData = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const addTopic = (topic) => {
    const data = getData();
    data.topics.push(topic);
    saveData(data);
  };

  const addLink = (link) => {
    const data = getData();
    data.links.push(link);
    saveData(data);
  };

  const addTask = (task) => {
    const data = getData();
    data.tasks.push(task);
    saveData(data);
  };

  const getTopicByName = (name) => {
    const data = getData();
    return data.topics.find((topic) => topic.name.toLowerCase() === name.toLowerCase());
  };

  return { STORAGE_KEY, defaultData, getData, saveData, addTopic, addLink, addTask, getTopicByName };
})();
