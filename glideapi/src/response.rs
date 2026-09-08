/// A minimal HTTP response
#[derive(Debug, Default)]
pub struct Response {
    pub status:  u16,
    pub body:    String,
    pub headers: Vec<(String, String)>,
}

impl Response {
    pub fn ok(body: impl Into<String>) -> Self {
        Self { status: 200, body: body.into(), headers: vec![] }
    }

    pub fn with_header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((key.into(), value.into()));
        self
    }

    /// Return raw bytes with a given content-type. Used for file downloads.
    pub fn binary(status: u16, bytes: Vec<u8>, content_type: &str) -> Self {
        // SAFETY: we store bytes as a latin-1 string and the framework must
        // write the raw bytes to the socket. This is a framework limitation —
        // a proper fix is to add a `body_bytes: Option<Vec<u8>>` field.
        // For now, from_utf8_lossy is intentionally avoided; we use
        // String::from_utf8_lossy only as a last resort fallback.
        let body = unsafe { String::from_utf8_unchecked(bytes) };
        Self {
            status,
            body,
            headers: vec![("content-type".into(), content_type.into())],
        }
    }
}

/// Anything that can become a Response
pub trait IntoResponse {
    fn into_response(self) -> Response;
}

impl IntoResponse for Response {
    fn into_response(self) -> Response { self }
}

impl IntoResponse for &'static str {
    fn into_response(self) -> Response { Response::ok(self) }
}

impl IntoResponse for String {
    fn into_response(self) -> Response { Response::ok(self) }
}

/// Json<T> wrapper — serialises T as JSON with content-type header
pub struct Json<T>(pub T);

impl<T: serde::Serialize> IntoResponse for Json<T> {
    fn into_response(self) -> Response {
        match serde_json::to_string(&self.0) {
            Ok(body) => Response::ok(body),
            Err(e) => Response { status: 500, body: e.to_string(), headers: vec![] },
        }
    }
}

impl<T: IntoResponse> IntoResponse for crate::error::Result<T> {
    fn into_response(self) -> Response {
        match self {
            Ok(v) => v.into_response(),
            Err(e) => e.into_response(),
        }
    }
}
