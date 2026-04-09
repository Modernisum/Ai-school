// lib/services/api_response.dart

abstract class ApiResponse<T> {
  const ApiResponse();
}

class ApiSuccess<T> extends ApiResponse<T> {
  final T data;
  final String? message;
  const ApiSuccess(this.data, {this.message});
}

class ApiError<T> extends ApiResponse<T> {
  final String message;
  final int? statusCode;
  final dynamic details;
  const ApiError(this.message, {this.statusCode, this.details});
}

class ApiLoading<T> extends ApiResponse<T> {
  const ApiLoading();
}
