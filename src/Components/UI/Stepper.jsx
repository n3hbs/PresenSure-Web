/**
 * PresenSure Standard Stepper Component
 *
 * Modern horizontal progression stepper with top indicator bar,
 * step numbering, and labels. Fully dark mode compatible.
 *
 * @param {Array<{ number?: number, label?: string, title?: string, name?: string }>} steps
 * @param {number} currentStep - 1-indexed current active step
 * @param {function(number): void} [onStepClick] - Optional callback when a step is clicked
 * @param {string} [className] - Additional container class names
 */
export default function Stepper({
    steps = [],
    currentStep = 1,
    onStepClick,
    className = "",
}) {
    if (!steps || steps.length === 0) return null;

    return (
        <nav aria-label="Progress" className={`w-full ${className}`}>
            <ol className="flex items-center gap-2 sm:gap-4">
                {steps.map((rawStep, index) => {
                    const stepNumber = rawStep.number ?? index + 1;
                    const label =
                        rawStep.label ?? rawStep.title ?? rawStep.name ?? `Step ${stepNumber}`;
                    const isCompleted = currentStep > stepNumber;
                    const isCurrent = currentStep === stepNumber;
                    const isClickable = Boolean(onStepClick);

                    const itemClass = `group flex w-full flex-col border-t-4 pt-2 text-left transition ${
                        isCompleted
                            ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                            : isCurrent
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                            : "border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500"
                    } ${isClickable ? "cursor-pointer focus:outline-none" : "cursor-default"}`;

                    const content = (
                        <>
                            <span className="text-xs font-semibold uppercase tracking-wider">
                                Step {stepNumber}
                            </span>
                            <span
                                className={`text-sm font-medium transition-colors ${
                                    isCompleted || isCurrent
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                                {label}
                            </span>
                        </>
                    );

                    return (
                        <li key={stepNumber} className="flex-1">
                            {isClickable ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick(stepNumber)}
                                    className={itemClass}
                                >
                                    {content}
                                </button>
                            ) : (
                                <div className={itemClass}>{content}</div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
