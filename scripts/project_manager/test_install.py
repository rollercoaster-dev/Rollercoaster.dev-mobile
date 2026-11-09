import plistlib
import tempfile
import unittest
from pathlib import Path
from install import install, WAKEUP_UNIT


class InstallTests(unittest.TestCase):
    def _upgrade(self, home, platform):
        source = Path(__file__).resolve().parents[2]
        link, service = install(source, home, '/usr/bin/python3', platform=platform, path_env='/usr/bin:/bin')
        old = Path(link).resolve()
        state = home / '.local/state/rollercoaster-pm'
        (state / 'existing-state').write_text('keep')
        link, service = install(source, home, '/usr/bin/python3', platform=platform, path_env='/usr/bin:/bin')
        self.assertNotEqual(Path(link).resolve(), old)
        self.assertEqual((state / 'existing-state').read_text(), 'keep')
        self.assertTrue((Path(link) / 'scripts/project_manager/pm.py').is_file())
        command = home / '.local/bin/rollercoaster-pm'
        self.assertTrue(command.is_symlink())
        self.assertEqual(command.resolve(), (Path(link) / 'scripts/project_manager/run-manager.sh').resolve())
        return source, Path(link), Path(service)

    def test_macos_upgrade_preserves_state_and_points_agent_at_installed_runtime(self):
        with tempfile.TemporaryDirectory() as d:
            source, link, agent = self._upgrade(Path(d), 'darwin')
            config = plistlib.loads(agent.read_bytes())
            self.assertEqual(config['ProgramArguments'][1], str(link / 'scripts/project_manager/telegram_bridge.py'))
            self.assertNotIn(str(source), str(config))
            self.assertEqual(config['KeepAlive'], True)

    def test_linux_upgrade_writes_systemd_units_pointing_at_installed_runtime(self):
        with tempfile.TemporaryDirectory() as d:
            home = Path(d)
            source, link, receiver = self._upgrade(home, 'linux')
            units = home / '.config/systemd/user'
            text = receiver.read_text()
            self.assertIn(f"{link / 'scripts/project_manager/telegram_bridge.py'} ", text)
            self.assertIn('Restart=always', text)
            self.assertNotIn(str(source), text)
            wakeup = (units / WAKEUP_UNIT).read_text()
            self.assertIn(f"ExecStart={link / 'scripts/project_manager/heartbeat.sh'} %i", wakeup)
            plan = (units / 'rollercoaster-pm-plan.timer').read_text()
            self.assertIn('OnCalendar=Mon..Fri *-*-* 09:00:00 Europe/Berlin', plan)
            self.assertIn('Unit=rollercoaster-pm@plan.service', plan)
            self.assertIn('Persistent=true', plan)
            tick = (units / 'rollercoaster-pm-tick.timer').read_text()
            self.assertIn('Persistent=false', tick)
            self.assertTrue(all('Mon..Fri' in line for line in tick.splitlines() if line.startswith('OnCalendar')))
            self.assertIn('OnCalendar=Mon..Fri *-*-* 18:00:00', (units / 'rollercoaster-pm-recap.timer').read_text())
            self.assertFalse((units / 'rollercoaster-pm-heartbeat.timer').exists())
            self.assertFalse((home / 'Library').exists())

    def test_unsupported_platform_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(RuntimeError):
                install(Path(__file__).resolve().parents[2], Path(d), '/usr/bin/python3', platform='win32')


if __name__ == '__main__': unittest.main()
