import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { ConditionNode } from "./ConditionNode";
import { WorkflowStepStatus } from "../../../types/workflow";

function buildProps(data: Record<string, unknown>, selected = false): NodeProps {
  return {
    id: "cond-1",
    type: "condition",
    data,
    selected,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    draggable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as NodeProps;
}

function renderNode(props: NodeProps) {
  return render(
    <ReactFlowProvider>
      <ConditionNode {...props} />
    </ReactFlowProvider>,
  );
}

describe("ConditionNode", () => {
  it("renders a placeholder subtitle when unconfigured", () => {
    renderNode(buildProps({}));
    expect(screen.getByText("Configure a condition")).toBeInTheDocument();
  });

  it("summarizes the configured field, operator, and value", () => {
    renderNode(buildProps({ field: "trigger.triggeredByEmployeeId", operator: "equals", value: "abc-123" }));
    expect(screen.getByText("trigger.triggeredByEmployeeId equals abc-123")).toBeInTheDocument();
  });

  it("renders True and False branch labels", () => {
    renderNode(buildProps({}));
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
  });

  it("shows a status indicator when a run step status is present", () => {
    renderNode(buildProps({ field: "x", operator: "equals", value: "1", status: WorkflowStepStatus.Succeeded }));
    expect(screen.getByTitle("Succeeded")).toBeInTheDocument();
  });
});
