
import React, { useState, useMemo } from 'react';
import { RoutineTask, TaskFrequency, TaskCompletions } from '../types';

interface RoutineChecklistProps {
  tasks: RoutineTask[];
  completions: TaskCompletions;
  onSave: (tasks: RoutineTask[]) => void;
  onToggleCompletion: (taskId: string) => void;
}

const dayOfWeekMap: { [key: number]: string } = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' };

export const RoutineChecklist: React.FC<RoutineChecklistProps> = ({ tasks, completions, onSave, onToggleCompletion }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<TaskFrequency>('daily');
  const [newTaskDay, setNewTaskDay] = useState<number>(1);
  const [newTaskRepetitions, setNewTaskRepetitions] = useState(1);

  const handleAddTask = () => {
    if (!newTaskText.trim()) return alert("Por favor, digite o nome da tarefa.");
    const newTask: RoutineTask = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      frequency: newTaskFreq,
      repetitions: newTaskFreq === 'daily' ? newTaskRepetitions : 1,
      dayOfWeek: newTaskFreq === 'weekly' ? newTaskDay : undefined,
    };
    
    onSave([...tasks, newTask]);
    setNewTaskText('');
    setNewTaskFreq('daily');
    setNewTaskRepetitions(1);
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
        const newTasks = tasks.filter(t => t.id !== taskId);
        onSave(newTasks);
    }
  }
  
  const dailyTasks = tasks.filter(t => t.frequency === 'daily');
  const weeklyTasks = tasks.filter(t => t.frequency === 'weekly');
  
  const TaskItem: React.FC<{task: RoutineTask}> = ({ task }) => {
    const taskCompletions = completions[task.id] || [];
    const isCompleted = taskCompletions.length >= task.repetitions;
    
    return (
        <div className="flex items-center p-3 bg-slate-800/50 rounded-md hover:bg-slate-700/50 transition-colors group">
            <input 
                type="checkbox" 
                id={`task-${task.id}`} 
                checked={isCompleted} 
                onChange={() => onToggleCompletion(task.id)}
                className="h-5 w-5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-blue-500 cursor-pointer"
            />
            <label 
                htmlFor={`task-${task.id}`} 
                className={`ml-3 text-sm flex-1 cursor-pointer transition-all ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}
            >
                {task.text}
            </label>
            <div className="flex items-center gap-3">
                 {task.repetitions > 1 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-800 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                        {taskCompletions.length}/{task.repetitions}
                    </span>
                )}
                {task.dayOfWeek !== undefined && (
                    <span className="text-xs bg-sky-800 text-sky-300 px-2 py-0.5 rounded-full">
                        {dayOfWeekMap[task.dayOfWeek]}
                    </span>
                )}
                <button onClick={() => handleDeleteTask(task.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700 shadow-lg backdrop-blur-sm space-y-8">
       <h2 className="text-2xl font-bold text-slate-100">Checklist de Rotinas</h2>
      
      {tasks.length > 0 ? (
        <>
          {dailyTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Rotinas Diárias</h3>
              <div className="space-y-2">
                {dailyTasks.map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}
          {weeklyTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Rotinas Semanais</h3>
              <div className="space-y-2">
                {weeklyTasks.map(task => <TaskItem key={task.id} task={task} />)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 px-6 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
            <h3 className="text-lg font-semibold text-slate-300">Sua lista de rotinas está vazia</h3>
            <p className="mt-1 text-slate-400">Use o formulário abaixo para começar a criar suas tarefas.</p>
        </div>
      )}

      <div className="pt-6 border-t border-blue-800/50">
             <h3 className="text-lg font-semibold text-slate-200 mb-4">Adicionar Nova Tarefa</h3>
             <div className="space-y-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Descrição da nova tarefa"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400"/>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <select value={newTaskFreq} onChange={(e) => setNewTaskFreq(e.target.value as TaskFrequency)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400">
                        <option value="daily">Diária</option>
                        <option value="weekly">Semanal</option>
                    </select>
                    {newTaskFreq === 'weekly' ? (
                        <select value={newTaskDay} onChange={(e) => setNewTaskDay(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400">
                            {Object.entries(dayOfWeekMap).map(([dayNum, dayName]) => <option key={dayNum} value={dayNum}>{dayName}</option>)}
                        </select>
                    ) : (
                        <div>
                             <label htmlFor="repetitions" className="block text-xs text-slate-400 mb-1">Repetições</label>
                             <input id="repetitions" type="number" min="1" value={newTaskRepetitions} onChange={e => setNewTaskRepetitions(Math.max(1, parseInt(e.target.value, 10)))} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-blue-400" />
                        </div>
                    )}
                </div>
                <button onClick={handleAddTask} className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
                    Adicionar Tarefa
                </button>
             </div>
        </div>
    </div>
  );
};
