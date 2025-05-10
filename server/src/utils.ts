import { GameServiceResponse } from "./type"

const generateErrorResponse = (errorMessage: string): GameServiceResponse => {
  return {
    success: false,
    msg: errorMessage,
    data: null
  }
}
const genereateSuccessResponse = <T = {[key: string]: any}>(msg: string = 'ok', data: T): GameServiceResponse<T> => {
  return {
    success: true,
    msg,
    data
  }
}

export {
  generateErrorResponse,
  genereateSuccessResponse
}