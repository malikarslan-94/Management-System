import { Employee } from '@/services/EmployeeService'

declare const EmployeeForm: React.FC<{
    initialData?: Partial<Employee>;
    onSubmit: (data: Partial<Employee>) => void;
    onCancel: () => void;
    loading?: boolean;
    isEditing?: boolean;
}>

export default EmployeeForm
