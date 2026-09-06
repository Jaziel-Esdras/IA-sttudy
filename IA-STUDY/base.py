from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.parse import urlparse
import json


@dataclass
class StudyTopic:
    name: str
    priority: int
    estimated_minutes: int
    difficulty: str = "média"
    completed: bool = False
    notes: List[str] = field(default_factory=list)

    def add_note(self, note: str) -> None:
        self.notes.append(note)

    def mark_completed(self) -> None:
        self.completed = True

    def summary(self) -> str:
        status = "concluído" if self.completed else "pendente"
        return (
            f"{self.name} | prioridade={self.priority} | "
            f"tempo={self.estimated_minutes} min | nível={self.difficulty} | {status}"
        )


@dataclass
class LinkResource:
    title: str
    url: str
    category: str = "geral"
    tags: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)

    @property
    def domain(self) -> str:
        parsed = urlparse(self.url)
        return parsed.netloc or "link externo"

    def add_note(self, note: str) -> None:
        self.notes.append(note)


class StudyPlanner:
    def __init__(self, daily_goal_minutes: int = 120) -> None:
        self.daily_goal_minutes = daily_goal_minutes
        self.topics: List[StudyTopic] = []
        self.links: List[LinkResource] = []

    def add_topic(
        self,
        name: str,
        priority: int,
        estimated_minutes: int,
        difficulty: str = "média",
    ) -> StudyTopic:
        topic = StudyTopic(
            name=name,
            priority=priority,
            estimated_minutes=estimated_minutes,
            difficulty=difficulty,
        )
        self.topics.append(topic)
        return topic

    def sorted_topics(self) -> List[StudyTopic]:
        return sorted(self.topics, key=lambda t: (-t.priority, t.estimated_minutes))

    def plan_for_day(self, available_minutes: Optional[int] = None) -> List[StudyTopic]:
        minutes = available_minutes or self.daily_goal_minutes
        plan: List[StudyTopic] = []
        remaining = minutes

        for topic in self.sorted_topics():
            if topic.completed:
                continue
            if topic.estimated_minutes <= remaining:
                plan.append(topic)
                remaining -= topic.estimated_minutes
                if remaining <= 0:
                    break

        return plan

    def add_link(
        self,
        title: str,
        url: str,
        category: str = "geral",
        tags: Optional[List[str]] = None,
        notes: Optional[List[str]] = None,
    ) -> LinkResource:
        resource = LinkResource(
            title=title,
            url=url,
            category=category,
            tags=tags or [],
            notes=notes or [],
        )
        self.links.append(resource)
        return resource

    def save_to_file(self, file_path: str = "study_data.json") -> None:
        payload = {
            "daily_goal_minutes": self.daily_goal_minutes,
            "topics": [
                {
                    "name": topic.name,
                    "priority": topic.priority,
                    "estimated_minutes": topic.estimated_minutes,
                    "difficulty": topic.difficulty,
                    "completed": topic.completed,
                    "notes": topic.notes,
                }
                for topic in self.topics
            ],
            "links": [
                {
                    "title": link.title,
                    "url": link.url,
                    "category": link.category,
                    "tags": link.tags,
                    "notes": link.notes,
                }
                for link in self.links
            ],
        }
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)

    @classmethod
    def load_from_file(cls, file_path: str = "study_data.json") -> "StudyPlanner":
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)
        except FileNotFoundError:
            return cls()

        planner = cls(daily_goal_minutes=data.get("daily_goal_minutes", 120))
        for item in data.get("topics", []):
            topic = StudyTopic(
                name=item["name"],
                priority=item.get("priority", 1),
                estimated_minutes=item.get("estimated_minutes", 30),
                difficulty=item.get("difficulty", "média"),
                completed=item.get("completed", False),
                notes=item.get("notes", []),
            )
            planner.topics.append(topic)

        for item in data.get("links", []):
            planner.links.append(
                LinkResource(
                    title=item.get("title", "Recurso sem título"),
                    url=item.get("url", ""),
                    category=item.get("category", "geral"),
                    tags=item.get("tags", []),
                    notes=item.get("notes", []),
                )
            )
        return planner


class StudyAssistant:
    def __init__(self, planner: StudyPlanner) -> None:
        self.planner = planner

    def get_status(self) -> Dict[str, object]:
        total = len(self.planner.topics)
        completed = sum(1 for topic in self.planner.topics if topic.completed)
        pending = total - completed
        return {
            "total_topics": total,
            "completed_topics": completed,
            "pending_topics": pending,
            "progress_pct": round((completed / total * 100), 2) if total else 0,
            "daily_plan": [topic.name for topic in self.planner.plan_for_day()],
        }

    def suggest_focus(self) -> List[str]:
        prioritized = self.planner.sorted_topics()
        return [topic.name for topic in prioritized if not topic.completed][:5]

    def generate_quick_quiz(self, topic_name: str, quantity: int = 3) -> List[str]:
        questions = []
        for index in range(1, quantity + 1):
            questions.append(
                f"{index}. Revise o assunto '{topic_name}' e responda: "
                f"quais são os pontos principais e qual é a sua conclusão?"
            )
        return questions

    def summarize_link(
        self,
        title: str,
        url: str,
        category: str = "geral",
        tags: Optional[List[str]] = None,
        notes: Optional[List[str]] = None,
    ) -> str:
        tags = tags or []
        notes = notes or []
        source = urlparse(url).netloc or "link externo"
        tag_text = ", ".join(tags) if tags else "sem tags"
        note_text = ". ".join(notes) if notes else "Nenhum comentário adicional registrado."

        return (
            f"Resumo do material: {title} | categoria={category} | fonte={source} | "
            f"tags={tag_text} | principais ideias: {note_text}"
        )

    def summarize_links(self, links: List[LinkResource]) -> List[str]:
        summaries = []
        for link in links:
            summaries.append(
                self.summarize_link(
                    title=link.title,
                    url=link.url,
                    category=link.category,
                    tags=link.tags,
                    notes=link.notes,
                )
            )
        return summaries

    def daily_summary(self) -> str:
        status = self.get_status()
        focus = ", ".join(self.suggest_focus()) or "nenhum tópico pendente"
        return (
            f"Progresso: {status['progress_pct']}% | "
            f"Tópicos concluídos: {status['completed_topics']} | "
            f"Foco recomendado: {focus}"
        )


def demo() -> None:
    planner = StudyPlanner(daily_goal_minutes=120)
    planner.add_topic("Matemática", 5, 45, "alta")
    planner.add_topic("História", 3, 30, "média")
    planner.add_topic("Física", 4, 40, "alta")
    planner.add_topic("Literatura", 2, 20, "baixa")

    planner.add_link(
        title="Algoritmos e estruturas de dados",
        url="https://www.youtube.com/watch?v=abc123",
        category="programação",
        tags=["lista", "pilha"],
        notes=["Explica listas e pilhas com exemplos simples."],
    )

    assistant = StudyAssistant(planner)
    print("Plano do dia:")
    for topic in planner.plan_for_day():
        print(f"- {topic.summary()}")

    print("\nResumo do estudo:")
    print(assistant.daily_summary())

    print("\nResumo de links:")
    for summary in assistant.summarize_links(planner.links):
        print(f"- {summary}")

    print("\nPerguntas rápidas:")
    for question in assistant.generate_quick_quiz("Matemática", 3):
        print(question)


if __name__ == "__main__":
    demo()
