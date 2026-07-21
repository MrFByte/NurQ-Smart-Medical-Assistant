import logging
import sys
from pythonjsonlogger import jsonlogger
import contextvars

# Context variables to store request-scoped data
request_id_var = contextvars.ContextVar("request_id", default=None)
path_var = contextvars.ContextVar("path", default=None)
method_var = contextvars.ContextVar("method", default=None)


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add timestamp and level
        if not log_record.get('timestamp'):
            log_record['timestamp'] = self.formatTime(record, self.datefmt)
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname

        # Inject context variables
        req_id = request_id_var.get()
        if req_id:
            log_record['request_id'] = req_id
            
        path = path_var.get()
        if path:
            log_record['path'] = path
            
        method = method_var.get()
        if method:
            log_record['method'] = method


def setup_logging():
    # Remove any existing handlers
    root_logger = logging.getLogger()
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # Create a stream handler for stdout
    log_handler = logging.StreamHandler(sys.stdout)
    
    # Define what fields to output
    format_str = '%(timestamp)s %(level)s %(name)s %(message)s'
    
    formatter = CustomJsonFormatter(format_str)
    log_handler.setFormatter(formatter)
    
    root_logger.addHandler(log_handler)
    root_logger.setLevel(logging.INFO)
    
    # You can customize log levels for chatty libraries here
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
