import { useState, useEffect } from "react";
import {
  TargetIcon,
  ClipboardListIcon,
  LayersIcon,
  BrainIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  AwardIcon,
  BookOpenIcon,
  ShuffleIcon,
  RotateCcwIcon,
  FlipIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XIcon,
} from "./Icons.jsx";

export default function QuizModal({
  isOpen,
  onClose,
  title,
  loading,
  error,
  studyData,
  onRetry,
}) {
  const [activeTab, setActiveTab] = useState("quiz"); // "quiz" | "flashcards"

  // ── Quiz State ──
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [qId]: optionIndex }
  const [isSubmitted, setIsSubmitted] = useState({}); // { [qId]: true }
  const [quizFinished, setQuizFinished] = useState(false);

  // ── Flashcard State ──
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState([]);

  // Reset or initialize state when studyData changes
  useEffect(() => {
    if (studyData?.flashcards) {
      setCards(studyData.flashcards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
    if (studyData?.questions) {
      setCurrentQIndex(0);
      setUserAnswers({});
      setIsSubmitted({});
      setQuizFinished(false);
    }
  }, [studyData]);

  // Keyboard navigation for flashcards & Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (activeTab === "flashcards" && cards.length > 0) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePrevCard();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNextCard();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab, cards.length, currentCardIndex]);

  if (!isOpen) return null;

  const questions = studyData?.questions || [];
  const currentQ = questions[currentQIndex];

  // ── Quiz Handlers ──
  const handleSelectOption = (index) => {
    if (isSubmitted[currentQ?.id]) return; // locked once checked
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: index,
    }));
    setIsSubmitted((prev) => ({
      ...prev,
      [currentQ.id]: true,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setUserAnswers({});
    setIsSubmitted({});
    setCurrentQIndex(0);
    setQuizFinished(false);
  };

  // Compute Quiz Score
  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (userAnswers[q.id] === q.answerIndex) {
        correct++;
      }
    });
    return correct;
  };

  // ── Flashcard Handlers ──
  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  const handleShuffleCards = () => {
    setIsFlipped(false);
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
  };

  const score = calculateScore();
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const currentCard = cards[currentCardIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-refined/40 backdrop-blur-xs animate-fade-in-up font-sans"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-canvas border border-border shadow-xl overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-ivory shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
              <TargetIcon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-refined truncate">
                Study & Quiz Center
              </h2>
              <p className="text-[11px] text-mineral truncate max-w-md">
                {title || studyData?.title || "Knowledge Reinforcement"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            {studyData && (
              <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-border text-xs">
                <button
                  onClick={() => setActiveTab("quiz")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "quiz"
                      ? "bg-refined text-white shadow-2xs"
                      : "text-mineral hover:text-refined"
                  }`}
                >
                  <ClipboardListIcon className="w-3.5 h-3.5" />
                  <span>Quiz (10)</span>
                </button>
                <button
                  onClick={() => setActiveTab("flashcards")}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "flashcards"
                      ? "bg-refined text-white shadow-2xs"
                      : "text-mineral hover:text-refined"
                  }`}
                >
                  <LayersIcon className="w-3.5 h-3.5" />
                  <span>Flashcards (10)</span>
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-mineral hover:text-refined hover:bg-mallow/50 transition-colors cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-mallow border border-border flex items-center justify-center text-refined shadow-2xs">
                <BrainIcon className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-refined">
                  Generating 10 MCQs & 10 Flashcards…
                </p>
                <p className="text-xs text-mineral mt-1 max-w-sm">
                  Analyzing semantic chunks and formulating rigorous questions strictly grounded in your documents.
                </p>
              </div>
              <div className="w-48 h-1.5 bg-ivory border border-border rounded-full overflow-hidden">
                <div className="h-full bg-refined rounded-full animate-pulse-glow" style={{ width: "70%" }} />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mb-3">
                <AlertTriangleIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-rose-800">Generation Failed</p>
              <p className="text-xs text-mineral mt-1 max-w-md mx-auto">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-refined hover:bg-refined-hover text-white text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Content: Quiz Mode */}
          {!loading && !error && studyData && activeTab === "quiz" && (
            <div>
              {!quizFinished ? (
                <div className="space-y-5">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-refined">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <span className="text-mineral">
                      Current Score: <strong className="text-refined font-bold">{score}</strong> / {questions.length}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-ivory border border-border h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-refined transition-all duration-300 rounded-full"
                      style={{
                        width: `${((currentQIndex + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Question Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-ivory border border-border shadow-2xs">
                    <p className="text-sm sm:text-base font-bold text-refined leading-snug">
                      {currentQ?.question}
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentQ?.options.map((opt, optIdx) => {
                      const hasChosen = isSubmitted[currentQ.id];
                      const isSelected = userAnswers[currentQ.id] === optIdx;
                      const isCorrect = optIdx === currentQ.answerIndex;

                      let btnStyle =
                        "bg-canvas hover:bg-ivory border-border text-refined";

                      if (hasChosen) {
                        if (isCorrect) {
                          btnStyle =
                            "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-200";
                        } else if (isSelected) {
                          btnStyle =
                            "bg-rose-50 border-rose-300 text-rose-900 font-semibold ring-1 ring-rose-200";
                        } else {
                          btnStyle = "bg-canvas border-border text-mineral opacity-60";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasChosen}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full p-3 sm:p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default shadow-2xs ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                hasChosen && isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : hasChosen && isSelected
                                  ? "bg-rose-600 text-white"
                                  : "bg-ivory border border-border text-refined"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>

                          {/* Result Indicators */}
                          {hasChosen && isCorrect && (
                            <span className="text-emerald-700 text-xs font-bold shrink-0 flex items-center gap-1.5">
                              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                              <span>Correct</span>
                            </span>
                          )}
                          {hasChosen && isSelected && !isCorrect && (
                            <span className="text-rose-700 text-xs font-bold shrink-0 flex items-center gap-1.5">
                              <XCircleIcon className="w-4 h-4 text-rose-600" />
                              <span>Incorrect</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Drawer after answering */}
                  {isSubmitted[currentQ?.id] && (
                    <div className="p-3.5 rounded-xl bg-ivory border border-border animate-fade-in-up">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-refined mb-1">
                        <LightbulbIcon className="w-4 h-4 text-refined" />
                        <span>Verified Explanation</span>
                      </div>
                      <p className="text-xs text-refined leading-relaxed font-sans">
                        {currentQ?.explanation}
                      </p>
                    </div>
                  )}

                  {/* Footer Navigation */}
                  <div className="pt-2 flex items-center justify-end">
                    {isSubmitted[currentQ?.id] ? (
                      <button
                        onClick={handleNextQuestion}
                        className="px-5 py-2 rounded-xl bg-refined hover:bg-refined-hover text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                      >
                        <span>
                          {currentQIndex < questions.length - 1
                            ? "Next Question"
                            : "View Final Results"}
                        </span>
                        {currentQIndex < questions.length - 1 ? (
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        ) : (
                          <TrophyIcon className="w-3.5 h-3.5 text-mallow" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-mineral italic">
                        Select an option to check your answer
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Quiz Complete / Results Screen */
                <div className="py-6 text-center space-y-5 animate-fade-in-up">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-mallow border border-border flex items-center justify-center text-refined shadow-sm">
                    {percentage >= 80 ? (
                      <TrophyIcon className="w-8 h-8 text-refined" />
                    ) : percentage >= 50 ? (
                      <AwardIcon className="w-8 h-8 text-refined" />
                    ) : (
                      <BookOpenIcon className="w-8 h-8 text-refined" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-refined font-display">Quiz Completed!</h3>
                    <p className="text-xs text-mineral mt-1">
                      {percentage >= 80
                        ? "Outstanding mastery of the material!"
                        : percentage >= 50
                        ? "Solid comprehension! Review explanations to reinforce knowledge."
                        : "Great practice! Review the flashcards to master this document."}
                    </p>
                  </div>

                  {/* Score Tally Gauge */}
                  <div className="inline-flex items-center gap-6 px-6 py-4 rounded-2xl bg-ivory border border-border shadow-2xs">
                    <div>
                      <div className="text-3xl font-extrabold text-refined">
                        {score} <span className="text-lg text-mineral font-normal">/ {questions.length}</span>
                      </div>
                      <div className="text-[11px] text-mineral font-medium">Correct Answers</div>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div>
                      <div
                        className={`text-3xl font-extrabold ${
                          percentage >= 80
                            ? "text-emerald-700"
                            : percentage >= 50
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {percentage}%
                      </div>
                      <div className="text-[11px] text-mineral font-medium">Accuracy</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleRestartQuiz}
                      className="px-4 py-2 rounded-xl bg-canvas hover:bg-ivory border border-border text-xs font-semibold text-refined transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcwIcon className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("flashcards")}
                      className="px-5 py-2 rounded-xl bg-refined hover:bg-refined-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Study Flashcards</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content: Flashcards Mode */}
          {!loading && !error && studyData && activeTab === "flashcards" && (
            <div className="space-y-4">
              {/* Header with counter and shuffle */}
              <div className="flex items-center justify-between text-xs text-mineral">
                <span>
                  Card <strong className="text-refined font-bold">{currentCardIndex + 1}</strong> of{" "}
                  {cards.length}
                </span>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[11px] text-mineral">
                    Tip: Use Space to flip, ← / → to navigate
                  </span>
                  <button
                    onClick={handleShuffleCards}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-canvas hover:bg-ivory text-refined border border-border cursor-pointer text-xs transition-colors font-medium shadow-2xs"
                  >
                    <ShuffleIcon className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="perspective-1000 w-full min-h-[260px] sm:min-h-[300px] cursor-pointer select-none group"
              >
                <div
                  className={`relative w-full min-h-[260px] sm:min-h-[300px] transition-transform duration-500 transform-style-3d ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* ── CARD FRONT ── */}
                  <div className="absolute inset-0 backface-hidden w-full h-full p-6 sm:p-8 rounded-2xl bg-canvas border border-border shadow-md flex flex-col justify-between group-hover:border-mineral-light transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-mallow text-refined border border-border">
                        {currentCard?.category || "Concept"}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-mineral tracking-wider">
                        Prompt / Question
                      </span>
                    </div>

                    <div className="my-auto text-center px-2 py-4">
                      <p className="text-base sm:text-lg font-bold text-refined leading-relaxed font-sans">
                        {currentCard?.front}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-mineral group-hover:text-refined transition-colors font-medium">
                      <FlipIcon className="w-3.5 h-3.5" />
                      <span>Click or press Space to reveal answer</span>
                    </div>
                  </div>

                  {/* ── CARD BACK ── */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full p-6 sm:p-8 rounded-2xl bg-ivory border border-border shadow-md flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-mallow text-refined border border-border">
                        {currentCard?.category || "Answer"}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-mineral tracking-wider">
                        Definition / Answer
                      </span>
                    </div>

                    <div className="my-auto text-center px-2 py-4 overflow-y-auto max-h-[180px]">
                      <p className="text-sm sm:text-base text-refined leading-relaxed font-sans font-medium">
                        {currentCard?.back}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-mineral">
                      <FlipIcon className="w-3.5 h-3.5" />
                      <span>Click to flip back</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handlePrevCard}
                  className="px-4 py-2 rounded-xl bg-canvas hover:bg-ivory border border-border text-refined text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Dots indicator */}
                <div className="flex items-center gap-1.5">
                  {cards.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIndex(idx);
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentCardIndex
                          ? "bg-refined w-4"
                          : "bg-border hover:bg-mineral-light w-2"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextCard}
                  className="px-4 py-2 rounded-xl bg-refined hover:bg-refined-hover text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
