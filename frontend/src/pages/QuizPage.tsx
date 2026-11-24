import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateQuizSession, useGeneratePlaylist, useQuiz } from '@/api/queries';
import { Button, ErrorState, Skeleton } from '@/components/ui';

export function QuizPage() {
  const quiz = useQuiz();
  const createSession = useCreateQuizSession();
  const generate = useGeneratePlaylist();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [familiarWeight, setFamiliarWeight] = useState(0.5);

  if (quiz.isPending) return <Skeleton lines={5} />;
  if (quiz.isError) return <ErrorState error={quiz.error} onRetry={() => void quiz.refetch()} />;

  const questions = quiz.data.questions;
  const total = questions.length;
  const onSliderStep = step === total;
  const question = questions[step];
  const busy = createSession.isPending || generate.isPending;

  const submit = () => {
    createSession.mutate(
      {
        familiarWeight,
        answers: questions.map((q) => ({
          questionId: q.questionId,
          optionId: answers[q.questionId] as number,
        })),
      },
      {
        onSuccess: (session) =>
          generate.mutate(
            { sessionId: session.sessionId, limit: 10, familiarWeight },
            { onSuccess: (p) => navigate(`/playlists/${p.playlistId}`) },
          ),
      },
    );
  };

  return (
    <div className="stack" style={{ maxWidth: '40rem', margin: '0 auto' }}>
      <h1>How are you feeling?</h1>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total + 1}
        aria-valuenow={step + 1}
        aria-label="Quiz progress"
      >
        <span style={{ width: `${((step + 1) / (total + 1)) * 100}%` }} />
      </div>
      <p className="muted">
        Step {step + 1} of {total + 1}
      </p>

      {question && (
        <fieldset className="stack">
          <legend>{question.prompt}</legend>
          {question.options.map((o) => (
            <label key={o.optionId} className="choice">
              <input
                type="radio"
                name={`q${question.questionId}`}
                checked={answers[question.questionId] === o.optionId}
                onChange={() => setAnswers((a) => ({ ...a, [question.questionId]: o.optionId }))}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}

      {onSliderStep && (
        <div className="stack">
          <label
            htmlFor="familiar"
            className="label"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}
          >
            Familiar or new?
          </label>
          <input
            id="familiar"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={familiarWeight}
            onChange={(e) => setFamiliarWeight(Number(e.target.value))}
            aria-valuetext={`${Math.round(familiarWeight * 100)} percent familiar`}
          />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">New discoveries</span>
            <span className="muted">Songs I know</span>
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Button
          variant="secondary"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        {onSliderStep ? (
          <Button loading={busy} onClick={submit}>
            Get my playlist
          </Button>
        ) : (
          <Button
            disabled={!question || answers[question.questionId] === undefined}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
