import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { post } from '../api.js';
import { ErrorNotice, Loading } from '../components/ui.jsx';
import { DrillRunner } from './DrillRunner.jsx';

// A stage serves its question: the conversation the person has not finished there, the question already
// waiting for them, or a new one at random. The person never picks the question.
export function StageRunner() {
  const { stage } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({});
  useEffect(() => {
    let live = true;
    setState({});
    post(`/practice/stages/${encodeURIComponent(stage)}/draw`, {})
      .then((d) => {
        if (!live) return;
        if (d.resumeAttemptId) navigate(`/attempts/${d.resumeAttemptId}`, { replace: true, state: { resumed: true } });
        else setState({ preview: d });
      })
      .catch((e) => live && setState({ error: e }));
    return () => {
      live = false;
    };
  }, [stage, navigate]);
  if (state.error) {
    return (
      <div className="page">
        <Link className="crumb" to="/practice">
          Back to Practice Studio
        </Link>
        <ErrorNotice error={state.error} />
      </div>
    );
  }
  if (!state.preview) {
    return (
      <div className="page">
        <Loading />
      </div>
    );
  }
  return <DrillRunner key={`${state.preview.drill.id}:${state.preview.scenario.persona.key}`} stage={stage} initialPreview={state.preview} />;
}
