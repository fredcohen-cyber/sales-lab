import { Router } from 'express';
import { route } from '../lib/errors.js';
import { loadAssignments } from '../curriculum/routes.js';
import { buildReport, parseFilters } from '../reports/routes.js';
import { nyDate } from '../lib/time.js';

export function homeRoutes({ db }) {
  const r = Router();
  r.get(
    '/home',
    route(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const assignments = (await loadAssignments(db, { learnerId: req.user.id })).filter((a) => a.status === 'active');
      const next =
        assignments
          .slice()
          .sort((x, y) => (x.dueDate || '9999-12-31').localeCompare(y.dueDate || '9999-12-31'))
          .flatMap((a) => a.items.filter((i) => i.state === 'available').map((i) => ({ ...i, assignmentId: a.id, assignmentTitle: a.title, dueDate: a.dueDate, overdue: a.overdue })))[0] || null;
      const recent = await db.many(
        `SELECT a.id, a.scenario->>'title' AS drill_title, a.submitted_at, a.mode, a.attempt_number, a.coached_number, e.overall_score, e.review_status,
                r.status AS run_status
           FROM attempts a LEFT JOIN evaluations e ON e.id = a.evaluation_id LEFT JOIN evaluation_runs r ON r.id = a.latest_run_id
          WHERE a.learner_id = $1 ORDER BY a.submitted_at DESC LIMIT 5`,
        [req.user.id],
      );
      const out = {
        today: nyDate(),
        next,
        activeAssignments: assignments.length,
        overdueAssignments: assignments.filter((a) => a.overdue).length,
        recent,
      };
      if (req.user.isManager) {
        const report = await buildReport(db, parseFilters({ period: 7 }));
        const pending = await db.one(`SELECT count(*) AS n FROM evaluations WHERE review_status = 'provisional'`);
        const invited = await db.one(
          `SELECT count(*) AS n FROM users u WHERE u.status = 'active' AND u.password_hash IS NULL`,
        );
        out.manager = {
          pendingReviews: pending.n,
          awaitingSetup: invited.n,
          team: report.groups.all,
          followUp: report.reps.filter((x) => x.followUp.length > 0).map((x) => ({ id: x.id, name: x.name, role: x.role, reasons: x.followUp })),
          disclosures: report.disclosures,
        };
      }
      res.json(out);
    }),
  );
  return r;
}
