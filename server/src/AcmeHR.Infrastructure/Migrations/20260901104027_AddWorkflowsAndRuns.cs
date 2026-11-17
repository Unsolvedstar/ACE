using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcmeHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkflowsAndRuns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OwnerEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    GraphJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workflows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Workflows_Employees_OwnerEmployeeId",
                        column: x => x.OwnerEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkflowId = table.Column<Guid>(type: "uuid", nullable: false),
                    TriggeredByEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    QueuedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkflowRuns_Employees_TriggeredByEmployeeId",
                        column: x => x.TriggeredByEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkflowRuns_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowRunSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkflowRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NodeType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InputJson = table.Column<string>(type: "text", nullable: true),
                    OutputJson = table.Column<string>(type: "text", nullable: true),
                    ErrorMessage = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNumber = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowRunSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkflowRunSteps_WorkflowRuns_WorkflowRunId",
                        column: x => x.WorkflowRunId,
                        principalTable: "WorkflowRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowRuns_TriggeredByEmployeeId",
                table: "WorkflowRuns",
                column: "TriggeredByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowRuns_WorkflowId_QueuedAtUtc",
                table: "WorkflowRuns",
                columns: new[] { "WorkflowId", "QueuedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowRunSteps_WorkflowRunId_SequenceNumber",
                table: "WorkflowRunSteps",
                columns: new[] { "WorkflowRunId", "SequenceNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_OwnerEmployeeId",
                table: "Workflows",
                column: "OwnerEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkflowRunSteps");

            migrationBuilder.DropTable(
                name: "WorkflowRuns");

            migrationBuilder.DropTable(
                name: "Workflows");
        }
    }
}
