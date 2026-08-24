using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Attachments;

public record UploadAttachmentRequest(string FileName, string ContentType, byte[] Content);

public record AttachmentDto(
    Guid Id,
    AttachmentEntityType EntityType,
    Guid EntityId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string UploadedByName,
    DateTime UploadedAtUtc);

public record AttachmentContentDto(string FileName, string ContentType, byte[] Content);
