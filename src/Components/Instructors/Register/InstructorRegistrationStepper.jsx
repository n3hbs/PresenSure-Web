import Stepper from "@/Components/UI/Stepper";

const defaultSteps = [
    { number: 1, label: "Information" },
    { number: 2, label: "Review" },
];

export default function InstructorRegistrationStepper({
    currentStep,
    steps = defaultSteps,
    onStepClick,
    className = "",
}) {
    return (
        <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={onStepClick}
            className={className}
        />
    );
}
