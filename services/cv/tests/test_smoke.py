import pytest
from nigehban_cv.cli import main


def test_version_flag_exits_cleanly(capsys):
    with pytest.raises(SystemExit) as exc:
        main(["--version"])
    assert exc.value.code == 0
    assert "nigehban-cv" in capsys.readouterr().out
