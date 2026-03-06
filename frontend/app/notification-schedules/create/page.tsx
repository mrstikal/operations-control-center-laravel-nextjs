"use client";

import NotificationScheduleForm from "@/components/notifications/NotificationScheduleForm";
import { useNotificationScheduleForm } from "@/hooks/notifications/useNotificationScheduleForm";

export default function CreateNotificationSchedulePage() {
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
  } = useNotificationScheduleForm({ mode: "create" });

  return (
    <NotificationScheduleForm
      title="New notification schedule"
      description="Create a trigger-based notification rule for your tenant."
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

