using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcmeHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentActionAuditAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AgentActionAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BoardId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToolName = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ArgumentsJson = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TargetTaskId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ResultDetail = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DecidedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    DecidedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExecutedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentActionAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentActionAudits_AgentConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AgentConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AgentActionAudits_BoardTasks_TargetTaskId",
                        column: x => x.TargetTaskId,
                        principalTable: "BoardTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AgentActionAudits_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgentActionAudits_Employees_DecidedByEmployeeId",
                        column: x => x.DecidedByEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AgentActionAudits_Employees_RequestedByEmployeeId",
                        column: x => x.RequestedByEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AgentBoardSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BoardId = table.Column<Guid>(type: "uuid", nullable: false),
                    AutoExecuteEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentBoardSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AgentBoardSettings_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AgentBoardSettings_Employees_UpdatedByEmployeeId",
                        column: x => x.UpdatedByEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionAudits_BoardId_Status",
                table: "AgentActionAudits",
                columns: new[] { "BoardId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionAudits_ConversationId",
                table: "AgentActionAudits",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionAudits_DecidedByEmployeeId",
                table: "AgentActionAudits",
                column: "DecidedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionAudits_RequestedByEmployeeId",
                table: "AgentActionAudits",
                column: "RequestedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentActionAudits_TargetTaskId",
                table: "AgentActionAudits",
                column: "TargetTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_AgentBoardSettings_BoardId",
                table: "AgentBoardSettings",
                column: "BoardId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AgentBoardSettings_UpdatedByEmployeeId",
                table: "AgentBoardSettings",
                column: "UpdatedByEmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentActionAudits");

            migrationBuilder.DropTable(
                name: "AgentBoardSettings");
        }
    }
}
