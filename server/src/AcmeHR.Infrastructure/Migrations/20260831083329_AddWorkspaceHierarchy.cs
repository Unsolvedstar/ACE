using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcmeHR.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkspaceHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FolderId",
                table: "Boards",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SpaceId",
                table: "Boards",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Spaces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OwnerEmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SiteId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Spaces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Spaces_Employees_OwnerEmployeeId",
                        column: x => x.OwnerEmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Spaces_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Folders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Folders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Folders_Spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "Spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SpaceMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpaceMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SpaceMembers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SpaceMembers_Spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "Spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Boards_FolderId",
                table: "Boards",
                column: "FolderId");

            migrationBuilder.CreateIndex(
                name: "IX_Boards_SpaceId",
                table: "Boards",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_Folders_SpaceId",
                table: "Folders",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_SpaceMembers_EmployeeId",
                table: "SpaceMembers",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_SpaceMembers_SpaceId_EmployeeId",
                table: "SpaceMembers",
                columns: new[] { "SpaceId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Spaces_OwnerEmployeeId",
                table: "Spaces",
                column: "OwnerEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_Spaces_SiteId",
                table: "Spaces",
                column: "SiteId");

            migrationBuilder.AddForeignKey(
                name: "FK_Boards_Folders_FolderId",
                table: "Boards",
                column: "FolderId",
                principalTable: "Folders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Boards_Spaces_SpaceId",
                table: "Boards",
                column: "SpaceId",
                principalTable: "Spaces",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Boards_Folders_FolderId",
                table: "Boards");

            migrationBuilder.DropForeignKey(
                name: "FK_Boards_Spaces_SpaceId",
                table: "Boards");

            migrationBuilder.DropTable(
                name: "Folders");

            migrationBuilder.DropTable(
                name: "SpaceMembers");

            migrationBuilder.DropTable(
                name: "Spaces");

            migrationBuilder.DropIndex(
                name: "IX_Boards_FolderId",
                table: "Boards");

            migrationBuilder.DropIndex(
                name: "IX_Boards_SpaceId",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "FolderId",
                table: "Boards");

            migrationBuilder.DropColumn(
                name: "SpaceId",
                table: "Boards");
        }
    }
}
