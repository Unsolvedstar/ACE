using PdfSharp.Fonts;

namespace AcmeHR.Infrastructure.Documents;

/// <summary>
/// PdfSharp resolves fonts through the host OS only on Windows. On Linux (Docker, CI, Render)
/// there is no "Arial", so drawing text throws a NullReferenceException deep inside PdfSharp.
/// This registers a resolver that maps any requested family onto a metric-compatible
/// Liberation Sans / DejaVu Sans file installed on the machine (package: fonts-liberation).
/// Windows keeps PdfSharp's built-in behaviour.
/// </summary>
public static class PdfFontSetup
{
    private static readonly object Gate = new();
    private static bool _configured;

    /// <summary>Idempotent; call before any PdfSharp text drawing (XFont / DrawString).</summary>
    public static void EnsureConfigured()
    {
        if (_configured || OperatingSystem.IsWindows())
        {
            return;
        }

        lock (Gate)
        {
            if (_configured)
            {
                return;
            }

            GlobalFontSettings.FontResolver ??= new SystemFontResolver();
            _configured = true;
        }
    }

    private sealed class SystemFontResolver : IFontResolver
    {
        private static readonly string[] SearchDirectories =
        [
            "/usr/share/fonts/truetype/liberation",
            "/usr/share/fonts/truetype/liberation2",
            "/usr/share/fonts/liberation",
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/dejavu",
            "/usr/share/fonts/TTF",
        ];

        // faceName -> candidate file names, best first (Liberation Sans, then DejaVu Sans).
        private static readonly Dictionary<string, string[]> Faces = new()
        {
            ["Sans-Regular"] = ["LiberationSans-Regular.ttf", "DejaVuSans.ttf"],
            ["Sans-Bold"] = ["LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
            ["Sans-Italic"] = ["LiberationSans-Italic.ttf", "DejaVuSans-Oblique.ttf"],
            ["Sans-BoldItalic"] = ["LiberationSans-BoldItalic.ttf", "DejaVuSans-BoldOblique.ttf"],
        };

        public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
        {
            var faceName = (isBold, isItalic) switch
            {
                (true, true) => "Sans-BoldItalic",
                (true, false) => "Sans-Bold",
                (false, true) => "Sans-Italic",
                _ => "Sans-Regular",
            };

            return new FontResolverInfo(faceName);
        }

        public byte[]? GetFont(string faceName)
        {
            if (!Faces.TryGetValue(faceName, out var candidates))
            {
                return null;
            }

            foreach (var file in candidates)
            {
                foreach (var directory in SearchDirectories)
                {
                    var path = Path.Combine(directory, file);
                    if (File.Exists(path))
                    {
                        return File.ReadAllBytes(path);
                    }
                }
            }

            throw new FileNotFoundException(
                "No usable system font found for PDF text. Install a TrueType font package " +
                "(e.g. `apt-get install fonts-liberation`) on this machine.");
        }
    }
}
