import importlib.util
import sys
from pathlib import Path
import unittest

BASE_PATH = Path(__file__).resolve().parents[1] / "IA-STUDY" / "base.py"
spec = importlib.util.spec_from_file_location("study_base", BASE_PATH)
module = importlib.util.module_from_spec(spec)
sys.modules["study_base"] = module
spec.loader.exec_module(module)

StudyPlanner = module.StudyPlanner
StudyAssistant = module.StudyAssistant


class TestStudyAssistant(unittest.TestCase):
    def test_summarize_link(self):
        planner = StudyPlanner(daily_goal_minutes=90)
        assistant = StudyAssistant(planner)

        summary = assistant.summarize_link(
            title="Algoritmos e estruturas de dados",
            url="https://www.youtube.com/watch?v=abc123",
            category="programação",
            tags=["lista", "pilha"],
            notes=["Explica listas e pilhas com exemplos simples."],
        )

        self.assertIn("Algoritmos e estruturas de dados", summary)
        self.assertIn("programação", summary)
        self.assertIn("youtube.com", summary)
        self.assertIn("lista", summary.lower())


if __name__ == "__main__":
    unittest.main()
