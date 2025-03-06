use std::str::FromStr;

use anyhow::{anyhow, Error};
use self::{ImageRendering::*, Language::*, Media::*};

#[derive(Debug, PartialEq, Copy, Clone)]
pub enum Media {
    Audio,
    Code(Language),
    Font,
    Iframe,
    Image(ImageRendering),
    Markdown,
    Model,
    Pdf,
    Text,
    Unknown,
    Video,
}

#[derive(Debug, PartialEq, Copy, Clone)]
pub enum Language {
    Css,
    JavaScript,
    Json,
    Python,
    Yaml,
}

//   impl Display for Language {
//     fn fmt(&self, f: &mut Formatter) -> fmt::Result {
//       write!(
//         f,
//         "{}",
//         match self {
//           Self::Css => "css",
//           Self::JavaScript => "javascript",
//           Self::Json => "json",
//           Self::Python => "python",
//           Self::Yaml => "yaml",
//         }
//       )
//     }
//   }

#[derive(Debug, PartialEq, Copy, Clone)]
pub enum ImageRendering {
    Auto,
    Pixelated,
}

//   impl Display for ImageRendering {
//     fn fmt(&self, f: &mut Formatter) -> fmt::Result {
//       write!(
//         f,
//         "{}",
//         match self {
//           Self::Auto => "auto",
//           Self::Pixelated => "pixelated",
//         }
//       )
//     }
//   }

  impl Media {
    #[rustfmt::skip]
    const TABLE: &'static [(&'static str, Media, &'static [&'static str])] = &[
      ("application/cbor",            Unknown,          &["cbor"]),
      ("application/json",            Code(Json),       &["json"]),
      ("application/octet-stream",    Unknown,          &["bin"]),
      ("application/pdf",             Pdf,              &["pdf"]),
      ("application/pgp-signature",   Text,             &["asc"]),
      ("application/protobuf",        Unknown,          &["binpb"]),
      ("application/x-bittorrent",    Unknown,          &["torrent"]),
      ("application/x-javascript",    Code(JavaScript), &[]),
      ("application/yaml",            Code(Yaml),       &["yaml", "yml"]),
      ("audio/flac",                  Audio,            &["flac"]),
      ("audio/mpeg",                  Audio,            &["mp3"]),
      ("audio/ogg;codecs=opus",       Audio,            &["opus"]),
      ("audio/wav",                   Audio,            &["wav"]),
      ("font/otf",                    Font,             &["otf"]),
      ("font/ttf",                    Font,             &["ttf"]),
      ("font/woff",                   Font,             &["woff"]),
      ("font/woff2",                  Font,             &["woff2"]),
      ("image/apng",                  Image(Pixelated), &["apng"]),
      ("image/avif",                  Image(Auto),      &["avif"]),
      ("image/gif",                   Image(Pixelated), &["gif"]),
      ("image/jpeg",                  Image(Pixelated), &["jpg", "jpeg"]),
      ("image/jxl",                   Image(Auto),      &[]),
      ("image/png",                   Image(Pixelated), &["png"]),
      ("image/svg+xml",               Iframe,           &["svg"]),
      ("image/webp",                  Image(Pixelated), &["webp"]),
      ("model/gltf+json",             Model,            &["gltf"]),
      ("model/gltf-binary",           Model,            &["glb"]),
      ("model/stl",                   Unknown,          &["stl"]),
      ("text/css",                    Code(Css),        &["css"]),
      ("text/html",                   Iframe,           &[]),
      ("text/html;charset=utf-8",     Iframe,           &["html"]),
      ("text/javascript",             Code(JavaScript), &["js", "mjs"]),
      ("text/markdown",               Markdown,         &[]),
      ("text/markdown;charset=utf-8", Markdown,         &["md"]),
      ("text/plain",                  Text,             &[]),
      ("text/plain;charset=utf-8",    Text,             &["txt"]),
      ("text/x-python",               Code(Python),     &["py"]),
      ("video/mp4",                   Video,            &["mp4"]),
      ("video/webm",                  Video,            &["webm"]),
    ];

//     pub(crate) fn content_type_for_path(
//       path: &Path,
//     ) -> Result<(&'static str, BrotliEncoderMode), Error> {
//       let extension = path
//         .extension()
//         .ok_or_else(|| anyhow!("file must have extension"))?
//         .to_str()
//         .ok_or_else(|| anyhow!("unrecognized extension"))?;

//       let extension = extension.to_lowercase();

//       if extension == "mp4" {
//         Media::check_mp4_codec(path)?;
//       }

//       for (content_type, mode, _, extensions) in Self::TABLE {
//         if extensions.contains(&extension.as_str()) {
//           return Ok((*content_type, *mode));
//         }
//       }

//       let mut extensions = Self::TABLE
//         .iter()
//         .flat_map(|(_, _, _, extensions)| extensions.first().cloned())
//         .collect::<Vec<&str>>();

//       extensions.sort();

//       Err(anyhow!(
//         "unsupported file extension `.{extension}`, supported extensions: {}",
//         extensions.join(" "),
//       ))
//     }

//     pub(crate) fn check_mp4_codec(path: &Path) -> Result<(), Error> {
//       let f = File::open(path)?;
//       let size = f.metadata()?.len();
//       let reader = BufReader::new(f);

//       let mp4 = Mp4Reader::read_header(reader, size)?;

//       for track in mp4.tracks().values() {
//         if let TrackType::Video = track.track_type()? {
//           let media_type = track.media_type()?;
//           if media_type != MediaType::H264 {
//             return Err(anyhow!(
//               "Unsupported video codec, only H.264 is supported in MP4: {media_type}"
//             ));
//           }
//         }
//       }

//       Ok(())
//     }
  }

impl FromStr for Media {
    type Err = Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        for entry in Self::TABLE {
            if entry.0 == s {
                return Ok(entry.1);
            }
        }

        Err(anyhow!("unknown content type: {s}"))
    }
}

//   #[cfg(test)]
//   mod tests {
//     use super::*;

//     #[test]
//     fn for_extension() {
//       assert_eq!(
//         Media::content_type_for_path(Path::new("pepe.jpg")).unwrap(),
//         ("image/jpeg", BrotliEncoderMode::BROTLI_MODE_GENERIC)
//       );
//       assert_eq!(
//         Media::content_type_for_path(Path::new("pepe.jpeg")).unwrap(),
//         ("image/jpeg", BrotliEncoderMode::BROTLI_MODE_GENERIC)
//       );
//       assert_eq!(
//         Media::content_type_for_path(Path::new("pepe.JPG")).unwrap(),
//         ("image/jpeg", BrotliEncoderMode::BROTLI_MODE_GENERIC)
//       );
//       assert_eq!(
//         Media::content_type_for_path(Path::new("pepe.txt")).unwrap(),
//         (
//           "text/plain;charset=utf-8",
//           BrotliEncoderMode::BROTLI_MODE_TEXT
//         )
//       );
//       assert_regex_match!(
//         Media::content_type_for_path(Path::new("pepe.foo")).unwrap_err(),
//         r"unsupported file extension `\.foo`, supported extensions: apng .*"
//       );
//     }

//     #[test]
//     fn h264_in_mp4_is_allowed() {
//       assert!(Media::check_mp4_codec(Path::new("examples/h264.mp4")).is_ok(),);
//     }

//     #[test]
//     fn av1_in_mp4_is_rejected() {
//       assert!(Media::check_mp4_codec(Path::new("examples/av1.mp4")).is_err(),);
//     }

//     #[test]
//     fn no_duplicate_extensions() {
//       let mut set = HashSet::new();
//       for (_, _, _, extensions) in Media::TABLE {
//         for extension in *extensions {
//           assert!(set.insert(extension), "duplicate extension `{extension}`");
//         }
//       }
//     }
//   }
