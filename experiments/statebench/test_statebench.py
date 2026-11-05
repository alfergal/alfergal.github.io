import importlib.util
import json
import math
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path


HERE = Path(__file__).parent
REPO = HERE.parents[1]
SPEC = importlib.util.spec_from_file_location(
    "statebench_experiment", HERE / "statebench_demostracion_sensibilidad.py"
)
EXPERIMENT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPERIMENT)


class StateBenchExperimentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stored = json.loads(
            (HERE / "statebench_sensibilidad_resultados.json").read_text(
                encoding="utf-8"
            )
        )

    def test_results_match_recomputed_traces(self):
        self.assertEqual(self.stored["seed"], EXPERIMENT.SEED)
        self.assertEqual(self.stored["variables"], EXPERIMENT.VARIABLES)
        self.assertEqual(self.stored["lengths"], list(EXPERIMENT.LENGTHS))
        self.assertEqual(self.stored["repetitions"], EXPERIMENT.REPETITIONS)
        computed = EXPERIMENT.run()
        for length, families in self.stored["results"].items():
            for family, metrics in families.items():
                for metric, expected in metrics.items():
                    actual = computed[int(length)][family][metric]
                    self.assertTrue(
                        math.isclose(actual, expected, rel_tol=0, abs_tol=1e-15),
                        (length, family, metric, expected, actual),
                    )

    def test_published_figure_is_the_regenerated_vector_plot(self):
        public_figure = REPO / "public/figures/statebench-sensibilidad.svg"
        with tempfile.TemporaryDirectory() as directory:
            regenerated = Path(directory) / "statebench-sensibilidad.svg"
            EXPERIMENT.render_figure(self.stored["results"], regenerated)
            generated_bytes = regenerated.read_bytes()
            published_bytes = public_figure.read_bytes()
        self.assertEqual(generated_bytes, published_bytes)
        self.assertNotRegex(generated_bytes.decode("utf-8"), r"<image[\s>]" )
        root = ET.fromstring(generated_bytes)
        self.assertTrue(root.tag.endswith("svg"))


if __name__ == "__main__":
    unittest.main()
