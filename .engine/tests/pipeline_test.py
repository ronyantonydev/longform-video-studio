"""Tests for the Python pipeline steps that decide timing and licences. Run: python3 -m unittest discover .engine/tests -p '*_test.py'"""
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

PIPE = pathlib.Path(__file__).resolve().parents[1] / "pipeline"


def run(script, *args):
    return subprocess.run([sys.executable, str(PIPE / script), *map(str, args)], capture_output=True, text=True)


def work_dir():
    w = pathlib.Path(tempfile.mkdtemp())
    (w / "audio").mkdir()
    (w / "cat" / "film").mkdir(parents=True)
    (w / "audio" / "timeline.json").write_text(json.dumps({"total": 20.0, "scenes": [
        {"id": "s01", "chapter": "A", "start": 0.6, "end": 9.0},
        {"id": "s02", "chapter": "A", "start": 10.0, "end": 18.5}]}))
    (w / "cat" / "film" / "shots.json").write_text(json.dumps({"w": 640, "h": 480, "shots": [
        {"idx": i, "start": i * 10.0, "end": i * 10.0 + 6.0, "dur": 6.0} for i in range(5)]}))
    return w


def plan(w, scenes, **extra):
    p = {"sources": {"film": {"file": "ia/film.mp4", "catalog": "film", "label": "Old Film (1936)",
                              "url": "https://archive.org/details/film", "licence": "Public domain"}},
         "photos": {"ph": {"label": "Photo", "url": "https://example.org/ph", "licence": "Public domain"}},
         "plan": scenes, **extra}
    (w / "plan.json").write_text(json.dumps(p))


class PlanShots(unittest.TestCase):
    def test_fills_every_scene_exactly(self):
        w = work_dir()
        plan(w, {"s01": [["v", "film", 0], ["v", "film", 1]], "s02": [["v", "film", 2], ["v", "film", 3]]})
        r = run("plan_shots.py", w)
        self.assertEqual(r.returncode, 0, r.stderr)
        edit = json.loads((w / "edit.json").read_text())
        self.assertAlmostEqual(sum(s["dur"] for s in edit["shots"]), 20.0, places=2)
        self.assertIn("VIDEO SHARE OK", r.stdout)

    def test_low_video_share_is_reported(self):
        w = work_dir()
        plan(w, {"s01": [["p", "ph"], ["p", "ph"]], "s02": [["p", "ph"], ["v", "film", 0]]})
        r = run("plan_shots.py", w, "--video-target", "70")
        self.assertIn("VIDEO SHARE LOW", r.stdout)

    def test_ledger_lists_used_assets_and_flags_missing_licences(self):
        w = work_dir()
        plan(w, {"s01": [["v", "film", 0]], "s02": [["v", "film", 1]]},
             music={"file": "music/x.ogg", "title": "Track"})
        r = run("plan_shots.py", w)
        ledger = json.loads((w / "licence-ledger.json").read_text())
        self.assertEqual({c["licence"] for c in ledger["clips"]}, {"Public domain"})
        self.assertIn("no licence or link recorded for: music: Track", r.stdout)

    def test_missing_scene_is_refused(self):
        w = work_dir()
        plan(w, {"s01": [["v", "film", 0]]})
        r = run("plan_shots.py", w)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("s02", r.stderr)

    def test_fixed_durations_are_kept(self):
        w = work_dir()
        plan(w, {"s01": [["v", "film", 0, {"d": 3.0}], ["v", "film", 1]], "s02": [["v", "film", 2]]})
        run("plan_shots.py", w)
        shots = json.loads((w / "edit.json").read_text())["shots"]
        self.assertAlmostEqual(shots[0]["dur"], 3.0, places=3)


class Captions(unittest.TestCase):
    def test_captions_follow_the_script_and_timeline(self):
        w = pathlib.Path(tempfile.mkdtemp())
        (w / "script.json").write_text(json.dumps({"title": "t", "chapters": [{"title": "A", "scenes": [
            {"id": "s01", "narration": "The dust came first. Then the trees."}]}]}))
        (w / "timeline.json").write_text(json.dumps({"total": 6, "scenes": [{"id": "s01", "start": 1.0, "end": 5.0}]}))
        r = run("captions.py", w / "script.json", w / "timeline.json", w / "out.srt")
        self.assertEqual(r.returncode, 0, r.stderr)
        srt = (w / "out.srt").read_text()
        self.assertIn("00:00:01,000 --> ", srt)
        self.assertIn("The dust came first.", srt)
        self.assertIn("--> 00:00:05,000", srt)


if __name__ == "__main__":
    unittest.main()
