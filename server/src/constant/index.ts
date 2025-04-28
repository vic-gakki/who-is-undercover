export enum ErrorMessage {
  ROOM_NOT_FOUND = 'Room not found',
  INVALID_PASSWORD = 'Invalid password',
  GAME_ALREADY_STARTED = 'Game already started',
  UNKNOEN_ERROR = 'Unknown error',
  ROOM_FULL = 'Sorry, this room is already full',
  YOU_ARE_OUT = 'Soory, you are out'
}

export enum OperateionMessage {
  ROOM_CREATED = 'Room created successfully',
  PLAYER_JOINED = 'A player joined',
  PLAYER_REJOINED = 'A player rejoined',
  PLAYER_LEFT = 'A player left',
  GAME_STARTED = 'Sorry, Game started',
  GAME_RESTARTED = 'Game restarted successfully',
  GAME_ENDED = 'Game ended',
  VOTE_CASTED = 'Vote casted successfully',
  DESCRIPTION_SUBMITTED = 'Description submitted successfully',
  VOTE_TIE = `Vote tied`,
}