import uuid
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.logger import request_id_var, path_var, method_var

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate a unique ID for the request
        req_id = str(uuid.uuid4())
        
        # Set context variables
        req_id_token = request_id_var.set(req_id)
        path_token = path_var.set(request.url.path)
        method_token = method_var.set(request.method)
        
        start_time = time.time()
        
        try:
            # You can uncomment this to log when a request starts
            # logger.info(f"Request started")
            
            response = await call_next(request)
            
            process_time = time.time() - start_time
            logger.info(
                f"Request completed",
                extra={
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time * 1000, 2)
                }
            )
            
            # Optional: Return the request_id in headers for tracing
            response.headers["X-Request-ID"] = req_id
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.exception(
                f"Request failed with exception",
                extra={
                    "status_code": 500,
                    "process_time_ms": round(process_time * 1000, 2)
                }
            )
            raise
        finally:
            # Reset context variables
            request_id_var.reset(req_id_token)
            path_var.reset(path_token)
            method_var.reset(method_token)
