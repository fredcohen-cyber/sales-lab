import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { post } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { ErrorNotice, Loading } from '../components/ui.jsx';
import { DrillRunner } from './DrillRunner.jsx';
import { filterQuery, savedPracticeFilters } from './PracticeStudio.jsx';

// A stage serves its question: the conversation the person has not finished there, the question already
// waiting for them, or a new one at random, within the product and buyer the person narrowed it to (from
// the link, or the filters they last used). The person never picks the question.
export function StageRunner() {
  const { stage } = useParams();
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({});
  const fromUrl = params.has('product') || params.has('buyer');
  const filters = fromUrl ? { product: params.get('product') || '', buyer: params.get('buyer') || '' } : savedPracticeFilters(user.id);
  const query = filterQuery(filters);
  const backTo = `/practice${query ? `?${query}` : ''}`;
  // What the questions are narrowed to, shown on the question so a rep arriving from another page knows.
  const narrowedTo = [meta.productLines?.[filters.product]?.label, meta.personas.find((p) => p.key === filters.buyer)?.label.toLowerCase()].filter(Boolean).join(', ');
  useEffect(() => {
    let live = true;
    setState({});
    post(`/practice/stages/${encodeURIComponent(stage)}/draw`, { product: filters.product || undefined, persona: filters.buyer || undefined })
      .then((d) => {
        if (!live) return;
        if (d.resumeAttemptId) navigate(`/attempts/${d.resumeAttemptId}`, { replace: true, state: { resumed: true } });
        else setState({ preview: d });
      })
      .catch((e) => live && setState({ error: e }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, query, navigate]);
  if (state.error) {
    return (
      <div className="page">
        <Link className="crumb" to={backTo}>
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
  return <DrillRunner key={`${state.preview.drill.id}:${state.preview.scenario.persona.key}`} stage={stage} initialPreview={state.preview} backHref={backTo} narrowedTo={narrowedTo} />;
}
