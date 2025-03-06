---
Title: Rate Limiting for Ordinals API
---

# Rate Limiting for Ordinals API

The Rate Limit per Minute(RPM) is applied to all the API endpoints based on the requested token addresses.


| **Endpoint**                 | **API Key Used**   | **Rate per minute(RPM) limit** |
|------------------------------|--------------------|--------------------------------|
| api.mainnet.hiro.so/ordinals | No                 | 50                             |
| api.mainnet.hiro.so/ordinals | Yes                | 500                            |

If you're interested in obtaining an API key from Hiro, you can generate a free key in the [Hiro Platform](https://platform.hiro.so/).
