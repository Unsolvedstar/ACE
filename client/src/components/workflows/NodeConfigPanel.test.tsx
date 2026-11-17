import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { WorkflowNodeType } from "../../types/workflow";

function buildNode(type: string, data: Record<string, unknown>): Node {
  return { id: "n1", type, position: { x: 0, y: 0 }, data };
}

describe("NodeConfigPanel", () => {
  it("shows a placeholder when no node is selected", () => {
    render(<NodeConfigPanel node={null} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Select a node to configure it.")).toBeInTheDocument();
  });

  it("calls onChange with the updated message, preserving other fields", () => {
    const onChange = vi.fn();
    const node = buildNode(WorkflowNodeType.Notification, { recipientEmployeeId: "emp-1", message: "old" });
    render(<NodeConfigPanel node={node} onChange={onChange} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "new message" } });

    expect(onChange).toHaveBeenCalledWith("n1", { recipientEmployeeId: "emp-1", message: "new message" });
  });

  it("renders webhook-specific fields for a webhook node", () => {
    const node = buildNode(WorkflowNodeType.Webhook, { url: "https://example.com", payloadTemplate: "{}" });
    render(<NodeConfigPanel node={node} onChange={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Target URL")).toHaveValue("https://example.com");
    expect(screen.getByLabelText("Payload (JSON)")).toHaveValue("{}");
  });

  it("renders condition-specific fields for a condition node", () => {
    const node = buildNode(WorkflowNodeType.Condition, { field: "trigger.x", operator: "equals", value: "1" });
    render(<NodeConfigPanel node={node} onChange={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Field (dotted path)")).toHaveValue("trigger.x");
    expect(screen.getByLabelText("Value")).toHaveValue("1");
  });

  it("renders ai agent-specific fields for an aiAgent node", () => {
    const node = buildNode(WorkflowNodeType.AiAgent, { boardId: "board-1", instruction: "Create a task" });
    render(<NodeConfigPanel node={node} onChange={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Board ID")).toHaveValue("board-1");
    expect(screen.getByLabelText("Instruction")).toHaveValue("Create a task");
  });

  it("renders the script editor for a code node", () => {
    const node = buildNode(WorkflowNodeType.Code, { codeTs: "return 1;", code: "return 1;" });
    render(<NodeConfigPanel node={node} onChange={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Script")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveTextContent("return 1;");
  });
});
