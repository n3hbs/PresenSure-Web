import Stepper from "@/Components/UI/Stepper";

const defaultSteps = [
    { number: 1, label: "Student Type" },
    { number: 2, label: "Information" },
    { number: 3, label: "Review" },
];

export default function StudentRegistrationStepper({
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
