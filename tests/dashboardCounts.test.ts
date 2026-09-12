import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDashboardCount } from '../src/lib/dashboard.ts';

test('formats counts from the current API statistics payload', () => {
  const stats = {
    total_students: 1234,
    answered_assessments_total: 856,
    working_student_count: 172,
    working_student_total: 1234,
    scenario_increase_count: 12,
    scenario_decrease_count: 24,
  };
  assert.equal(formatDashboardCount(stats.total_students), (1234).toLocaleString());
  assert.equal(formatDashboardCount(stats.answered_assessments_total), '856');
  assert.equal(formatDashboardCount(stats.scenario_increase_count), '12');
});

test('missing or invalid counts stay distinguishable from zero without throwing', () => {
  for (const value of [undefined, null, '', ' ', 'invalid', NaN, Infinity, -1, 1.5, {}, []]) {
    assert.equal(formatDashboardCount(value), '—');
  }
  assert.equal(formatDashboardCount(0), '0');
  assert.equal(formatDashboardCount('0'), '0');
  assert.equal(formatDashboardCount('1234'), (1234).toLocaleString());
});
