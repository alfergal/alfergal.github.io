"""Fast checks of the scientific protocol; no training or network required."""

import unittest
import numpy as np
from skimage.color import deltaE_ciede2000
from experimento import read_manifest, degrade, metrics, summarize


class ProtocolTests(unittest.TestCase):
    def test_disjoint_paintings_and_unique_sources(self):
        rows = read_manifest()
        partitions = [
            {r["object_id"] for r in rows if r["split"] == s}
            for s in ["train", "validation", "test"]
        ]
        self.assertFalse(
            partitions[0] & partitions[1]
            | partitions[0] & partitions[2]
            | partitions[1] & partitions[2]
        )
        self.assertEqual(len({r["sha256"] for r in rows}), 20)

    def test_degradation_identity_and_range(self):
        image = np.random.default_rng(42).random((12, 12, 3), dtype=np.float32)
        np.testing.assert_allclose(degrade(image, 0), image, atol=1e-7)
        for s in [0.25, 0.5, 0.75, 1]:
            output = degrade(image, s)
            self.assertGreaterEqual(output.min(), 0)
            self.assertLessEqual(output.max(), 1)
            self.assertTrue(np.all(output[..., 2] <= degrade(image, 0)[..., 2] + 0.15))

    def test_metric_identity_and_known_ciede2000_pair(self):
        # Sharma et al. supplementary test pair 1; validates the metric implementation.
        self.assertAlmostEqual(
            float(
                deltaE_ciede2000(
                    np.array([50, 2.6772, -79.7751]), np.array([50, 0, -82.7485])
                )
            ),
            2.0425,
            places=4,
        )
        image = np.random.default_rng(1).random((16, 16, 3), dtype=np.float32)
        result = metrics(image, image.copy())
        self.assertEqual(result["mae"], 0)
        self.assertEqual(result["delta_e"], 0)
        self.assertAlmostEqual(result["ssim"], 1)

    def test_bootstrap_clusters_paintings_not_pixels(self):
        from experimento import METHODS

        records = [
            dict(
                object_id=oid,
                intensity=s,
                method=m,
                mae=oid / 10,
                ssim=1 - oid / 10,
                delta_e=oid,
            )
            for oid in range(1, 5)
            for s in [0.25, 0.5, 0.75, 1]
            for m in METHODS
        ]
        summary = summarize(records)
        for result in summary.values():
            self.assertAlmostEqual(result["mae"]["mean"], 0.25)
            self.assertEqual(result["delta_e"]["mean"], 2.5)
            self.assertGreater(result["delta_e"]["sd_between_paintings"], 0)
            self.assertLess(result["delta_e"]["ci95"][0], 2.5)
            self.assertGreater(result["delta_e"]["ci95"][1], 2.5)


if __name__ == "__main__":
    unittest.main()
