"""Run the isolated voting and concurrency regression instead of seeding the app database."""
import unittest

if __name__ == '__main__':
    from tests.test_functional_refactor import FunctionalTests
    suite = unittest.TestSuite([FunctionalTests('test_real_biometrics_and_concurrent_ballots')])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
