import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface AlertProps {
  mode: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}

export function Alert({ mode, children }: AlertProps) {
  return (
    // ¿ why does this conditional classname not work...
    // className={`alert shadow-lg alert-${mode}`}
    <div
      className={`alert shadow-lg ${mode == "error" && "alert-error"} ${
        mode == "info" && "alert-info"
      } ${mode == "success" && "alert-success"} ${
        mode == "warning" && "alert-warning"
      }`}
    >
      <div>
        {mode == "info" && (
          <InformationCircleIcon className="h-6 w-6" strokeWidth="2" />
        )}
        {mode == "success" && (
          <CheckCircleIcon className="h-6 w-6" strokeWidth="2" />
        )}
        {mode == "warning" && (
          <ExclamationTriangleIcon className="h-6 w-6" strokeWidth="2" />
        )}
        {mode == "error" && <XCircleIcon className="h-6 w-6" strokeWidth="2" />}
        {children}
      </div>
    </div>
  );
}
