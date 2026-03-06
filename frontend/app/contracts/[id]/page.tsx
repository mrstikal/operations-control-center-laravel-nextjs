"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ContractEditModal from "@/components/contracts/ContractEditModal";
import ContractIncidentCreateModal from "@/components/contracts/ContractIncidentCreateModal";
import ContractIncidentEditModal from "@/components/contracts/ContractIncidentEditModal";
import ContractActions from "@/components/contracts/detail/ContractActions";
import ContractBudgetProgress from "@/components/contracts/detail/ContractBudgetProgress";
import ContractDescriptionCard from "@/components/contracts/detail/ContractDescriptionCard";
import ContractHeader from "@/components/contracts/detail/ContractHeader";
import ContractIncidentsPanel from "@/components/contracts/detail/ContractIncidentsPanel";
import ContractMetadataGrid from "@/components/contracts/detail/ContractMetadataGrid";
import ContractTimelineSection from "@/components/contracts/detail/ContractTimelineSection";
import { useContractDetail } from "@/hooks/contracts/useContractDetail";
import { normalizeContractTenantId } from "@/lib/contracts/scope";

export default function ContractDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contractId = params.id as string;
  const tenantId = useMemo(
    () => normalizeContractTenantId(searchParams.get("tenant_id")),
    [searchParams]
  );

  const {
    contract,
    incidents,
    loading,
    loadError,
    errorMessage,
    actionLoading,
    contractEditLoading,
    incidentLoading,
    isReadOnly,
    canEditContracts,
    canDeleteContracts,
    canApproveContracts,
    isEditContractModalOpen,
    isEditIncidentModalOpen,
    isCreateIncidentModalOpen,
    incidentCreateForm,
    incidentEditForm,
    clearErrorAction,
    goBackAction,
    openEditContractModalAction,
    closeEditContractModalAction,
    handleApproveAction,
    handleSoftDeleteAction,
    handleHardDeleteAction,
    handleRestoreAction,
    openCreateIncidentModalAction,
    closeCreateIncidentModalAction,
    openEditIncidentModalAction,
    closeEditIncidentModalAction,
    updateIncidentCreateFormAction,
    updateIncidentEditFormAction,
    handleIncidentSubmitAction,
    handleIncidentUpdateAction,
    handleIncidentDeleteAction,
    handleContractEditSubmitAction,
  } = useContractDetail(contractId, tenantId ? { tenantId } : undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {loadError}
        </div>
        <button
          type="button"
          onClick={goBackAction}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-slate-500">Contract not found</div>
        <button
          type="button"
          onClick={goBackAction}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center justify-between gap-3">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={clearErrorAction}
                className="rounded-sm border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <ContractHeader contract={contract} />
            <ContractActions
              canApproveContracts={canApproveContracts}
              canEditContracts={canEditContracts}
              canDeleteContracts={canDeleteContracts}
              isDeleted={Boolean(contract.deleted_at)}
              isDraft={contract.status === "draft"}
              actionLoading={actionLoading}
              isReadOnly={isReadOnly}
              onApproveAction={() => {
                void handleApproveAction();
              }}
              onEditAction={openEditContractModalAction}
              onSoftDeleteAction={() => {
                void handleSoftDeleteAction();
              }}
              onRestoreAction={() => {
                void handleRestoreAction();
              }}
              onHardDeleteAction={() => {
                void handleHardDeleteAction();
              }}
            />
          </div>
        </div>

        <ContractMetadataGrid contract={contract} />
        <ContractDescriptionCard description={contract.description} />

        <ContractIncidentsPanel
          incidents={incidents}
          canEditContracts={canEditContracts}
          canDeleteContracts={canDeleteContracts}
          isReadOnly={isReadOnly}
          onAddIncidentAction={openCreateIncidentModalAction}
          onEditIncidentAction={openEditIncidentModalAction}
          onDeleteIncidentAction={(incidentId) => {
            void handleIncidentDeleteAction(incidentId);
          }}
        />

        <ContractTimelineSection contract={contract} />
        <ContractBudgetProgress budget={contract.budget} spent={contract.spent} />
      </div>

      <ContractIncidentEditModal
        isOpen={isEditIncidentModalOpen && canEditContracts && !isReadOnly}
        loading={incidentLoading || isReadOnly}
        formData={incidentEditForm}
        onCloseAction={() => closeEditIncidentModalAction()}
        onSubmitAction={() => {
          void handleIncidentUpdateAction();
        }}
        onFormChangeAction={updateIncidentEditFormAction}
      />

      <ContractIncidentCreateModal
        isOpen={isCreateIncidentModalOpen && canEditContracts && !isReadOnly}
        loading={incidentLoading || isReadOnly}
        formData={incidentCreateForm}
        onCloseAction={() => closeCreateIncidentModalAction()}
        onSubmitAction={() => {
          void handleIncidentSubmitAction();
        }}
        onFormChangeAction={updateIncidentCreateFormAction}
      />

      <ContractEditModal
        isOpen={isEditContractModalOpen && canEditContracts && !isReadOnly}
        contract={contract}
        loading={contractEditLoading || isReadOnly}
        onCloseAction={closeEditContractModalAction}
        onSubmitAction={handleContractEditSubmitAction}
      />
    </>
  );
}
