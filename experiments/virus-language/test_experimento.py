import json
import unittest
from pathlib import Path

import numpy as np

from experimento import generate_data, make_splits, run


ROOT = Path(__file__).parent


class ExperimentTests(unittest.TestCase):
    def test_generation_is_deterministic_and_non_biological(self):
        first = generate_data()
        second = generate_data()
        for left, right in zip(first, second):
            np.testing.assert_array_equal(left, right)
        sequences, labels, groups = first
        self.assertEqual(len(sequences), 480)
        self.assertEqual(len(set(sequences)), 480)
        self.assertEqual(set("".join(sequences)), set("0123"))
        self.assertEqual(set(labels.tolist()), {0, 1, 2})
        self.assertEqual(len(np.unique(groups)), 60)

    def test_group_split_keeps_all_related_records_on_one_side(self):
        _, labels, groups = generate_data()
        splits = make_splits(labels, groups)
        train, test = splits["held_out_groups"]
        self.assertFalse(set(groups[train]) & set(groups[test]))
        self.assertEqual(len(train), 360)
        self.assertEqual(len(test), 120)
        random_train, random_test = splits["random_sample"]
        self.assertGreater(len(set(groups[random_train]) & set(groups[random_test])), 0)

    def test_precomputed_results_reproduce_and_report_valid_metrics(self):
        stored = json.loads((ROOT / "resultados.json").read_text(encoding="utf-8"))
        fresh = run()
        self.assertEqual(stored["seed"], fresh["seed"])
        self.assertEqual(stored["observations"], fresh["observations"])
        self.assertEqual(stored["exact_duplicates"], 0)
        self.assertEqual(stored["shared_fraction_within_group"], 0.25)
        self.assertEqual(stored["metrics"], fresh["metrics"])
        self.assertTrue(stored["synthetic_only"])
        for split in ("random_sample", "held_out_groups"):
            for method in ("composicion", "kmer3"):
                values = stored["metrics"][split][method]
                for metric in ("macro_f1", "balanced_accuracy"):
                    self.assertGreaterEqual(values[metric], 0)
                    self.assertLessEqual(values[metric], 1)
                self.assertEqual(sum(map(sum, values["confusion_matrix"])), 120)

    def test_published_article_values_match_the_reproduced_results(self):
        results = json.loads((ROOT / "resultados.json").read_text(encoding="utf-8"))
        article = (
            ROOT.parents[1] / "src/content/blog/ia-lenguaje-de-los-virus.mdx"
        ).read_text(encoding="utf-8")
        random_kmer = results["metrics"]["random_sample"]["kmer3"]
        grouped_kmer = results["metrics"]["held_out_groups"]["kmer3"]
        grouped_composition = results["metrics"]["held_out_groups"]["composicion"]
        reported_values = (
            random_kmer["macro_f1"],
            grouped_kmer["macro_f1"],
            grouped_kmer["balanced_accuracy"],
            grouped_composition["macro_f1"],
            results["metrics"]["random_sample"]["shared_groups"],
        )
        for value in reported_values:
            formatted = (
                f"{value:.3f}".replace(".", ",")
                if isinstance(value, float)
                else str(value)
            )
            self.assertIn(formatted, article)
        self.assertIn("480 cadenas", article)
        self.assertIn("60 grupos", article)
        self.assertIn("120 ejemplos", article)


if __name__ == "__main__":
    unittest.main()
