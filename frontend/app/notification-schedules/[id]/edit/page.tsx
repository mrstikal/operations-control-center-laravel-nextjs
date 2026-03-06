"use client";

import { useParams } from "next/navigation";
import NotificationScheduleForm from "@/components/notifications/NotificationScheduleForm";
import { useNotificationScheduleForm } from "@/hooks/notifications/useNotificationScheduleForm";

export default function EditNotificationSchedulePage() {
  const params = useParams();
  const scheduleId = params.id as string;

  const {
    loading,
    submitting,
    error,
    isReadOnly,
    name,
    notificationType,
    trigger,
    isActive,
    selectedRoles,
    dedupeTtlMinutes,
    advancedMode,
    conditionsJson,
    recipientsJson,
    setName,
    setNotificationType,
    setTrigger,
    setIsActive,
    setSelectedRoles,
    setDedupeTtlMinutes,
    setAdvancedMode,
    setConditionsJson,
    setRecipientsJson,
    submitAction,
    cancelAction,
  } = useNotificationScheduleForm({ mode: "edit", scheduleId });

  return (
    <NotificationScheduleForm
      title="Edit notification schedule"
      description="Update trigger conditions, recipients, and activation state."
      loading={loading}
      submitting={submitting}
      error={error}
      isReadOnly={isReadOnly}
      name={name}
      notificationType={notificationType}
      trigger={trigger}
      isActive={isActive}
      selectedRoles={selectedRoles}
      dedupeTtlMinutes={dedupeTtlMinutes}
      advancedMode={advancedMode}
      conditionsJson={conditionsJson}
      recipientsJson={recipientsJson}
      setNameAction={setName}
      setNotificationTypeAction={setNotificationType}
      setTriggerAction={setTrigger}
      setIsActiveAction={setIsActive}
      setSelectedRolesAction={setSelectedRoles}
      setDedupeTtlMinutesAction={setDedupeTtlMinutes}
      setAdvancedModeAction={setAdvancedMode}
      setConditionsJsonAction={setConditionsJson}
      setRecipientsJsonAction={setRecipientsJson}
      onSubmitAction={() => {
        void submitAction();
      }}
      onCancelAction={cancelAction}
    />
  );
}

