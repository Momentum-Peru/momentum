import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Board,
  CreateBoardRequest,
  UpdateBoardRequest,
  InviteUserRequest,
  UpdateInvitationRequest,
} from '../interfaces/board.interface';

/**
 * Servicio para gestionar Boards (Tableros)
 * Principio de Responsabilidad Única: Solo maneja las llamadas HTTP al endpoint de boards
 */
@Injectable({ providedIn: 'root' })
export class BoardsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/boards`;

  // Signals para el estado reactivo
  public readonly boards = signal<Board[]>([]);
  public readonly loading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly selectedBoard = signal<Board | null>(null);

  /**
   * Obtiene todos los tableros del usuario
   */
  getAll(): Observable<Board[]> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<Board[]>(this.baseUrl).pipe(
      tap((boards) => {
        this.boards.set(boards);
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Obtiene un tablero por ID
   */
  getById(id: string): Observable<Board> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<Board>(`${this.baseUrl}/${id}`).pipe(
      tap((board) => {
        this.selectedBoard.set(board);
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Crea un nuevo tablero
   */
  create(boardData: CreateBoardRequest): Observable<Board> {
    this.setLoading(true);
    this.setError(null);

    return this.http.post<Board>(this.baseUrl, boardData).pipe(
      tap((newBoard) => {
        const currentBoards = this.boards();
        this.boards.set([...currentBoards, newBoard]);
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Actualiza un tablero existente
   */
  update(id: string, boardData: UpdateBoardRequest): Observable<Board> {
    this.setLoading(true);
    this.setError(null);

    return this.http.patch<Board>(`${this.baseUrl}/${id}`, boardData).pipe(
      tap((updatedBoard) => {
        const currentBoards = this.boards();
        const index = currentBoards.findIndex((board) => board._id === id);
        if (index !== -1) {
          currentBoards[index] = updatedBoard;
          this.boards.set([...currentBoards]);
        }
        if (this.selectedBoard()?._id === id) {
          this.selectedBoard.set(updatedBoard);
        }
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Elimina un tablero
   */
  delete(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        const currentBoards = this.boards();
        const filteredBoards = currentBoards.filter((board) => board._id !== id);
        this.boards.set(filteredBoards);
        if (this.selectedBoard()?._id === id) {
          this.selectedBoard.set(null);
        }
      }),
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Invita a un usuario a un tablero
   */
  inviteUser(boardId: string, inviteData: InviteUserRequest): Observable<Board> {
    // No establecer loading ni error global para no afectar la UI de la lista
    // El error se maneja localmente en el componente con toast
    return this.http.post<Board>(`${this.baseUrl}/${boardId}/invite`, inviteData).pipe(
      tap((updatedBoard) => {
        const currentBoards = this.boards();
        const index = currentBoards.findIndex((board) => board._id === boardId);
        if (index !== -1) {
          currentBoards[index] = updatedBoard;
          this.boards.set([...currentBoards]);
        }
        if (this.selectedBoard()?._id === boardId) {
          this.selectedBoard.set(updatedBoard);
        }
      })
      // No manejar el error aquí, se maneja en el componente con toast
    );
  }

  /**
   * Actualiza el estado de una invitación
   */
  updateInvitation(
    boardId: string,
    invitationId: string,
    updateData: UpdateInvitationRequest
  ): Observable<Board> {
    this.setLoading(true);
    this.setError(null);

    return this.http
      .patch<Board>(`${this.baseUrl}/${boardId}/invitations/${invitationId}`, updateData)
      .pipe(
        tap((updatedBoard) => {
          const currentBoards = this.boards();
          const index = currentBoards.findIndex((board) => board._id === boardId);
          if (index !== -1) {
            currentBoards[index] = updatedBoard;
            this.boards.set([...currentBoards]);
          }
          if (this.selectedBoard()?._id === boardId) {
            this.selectedBoard.set(updatedBoard);
          }
        }),
        tap(() => this.setLoading(false)),
        tap({ error: (err) => this.handleError(err) })
      );
  }

  /**
   * Obtiene las invitaciones pendientes del usuario
   */
  getPendingInvitations(): Observable<Board[]> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<Board[]>(`${this.baseUrl}/invitations/pending`).pipe(
      tap(() => this.setLoading(false)),
      tap({ error: (err) => this.handleError(err) })
    );
  }

  /**
   * Refresca la lista de tableros
   */
  refresh(): void {
    this.getAll().subscribe();
  }

  /**
   * Limpia el estado del servicio
   */
  clearState(): void {
    this.boards.set([]);
    this.selectedBoard.set(null);
    this.setLoading(false);
    this.setError(null);
  }

  // Métodos privados para manejo de estado
  private setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  private setError(error: string | null): void {
    this.error.set(error);
  }

  private handleError(error: unknown): void {
    let errorMessage = 'Error desconocido';
    if (error && typeof error === 'object') {
      if (
        'error' in error &&
        error.error &&
        typeof error.error === 'object' &&
        'message' in error.error
      ) {
        errorMessage = String(error.error.message);
      } else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }
    this.setError(errorMessage);
    this.setLoading(false);
  }
}
